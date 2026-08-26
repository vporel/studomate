import AnalysisIssuesMapper from "@/bridge/analysis-issues.mapper";
import ProjectAnalyser, { ProjectAnalysisResult } from "@/project-analyser/project.analyser";
import ProjectCompiler, { ProjectCompilationResult } from "@/project-compiler/project.compiler";
import { isPreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import PLC from "@/simulator/core/plc/plc";
import ExpressionsWatcher from "@/simulator/runtime/expressions-watcher";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	SimulationVariableState,
} from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import SimulationNotifier from "./simulation.notifier";

const SIMULATION_MODE_STORAGE_KEY = "studomate:simulationMode";

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	private plc: PLC | null = null;

	/**
	 * Expressions observées pendant la simulation, en marge du programme : sert par exemple à
	 * montrer si la réceptivité d'une transition est vraie à cet instant.
	 */
	private expressionsWatcher: ExpressionsWatcher | null = null;

	private notifier: SimulationNotifier;

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
		notifier: SimulationNotifier,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.notifier = notifier;
	}

	static getPersistedSimulationMode(): SimulationMode {
		if (typeof window === "undefined") return SimulationMode.CONTINUOUS;
		const stored = localStorage.getItem(SIMULATION_MODE_STORAGE_KEY);
		if (stored === SimulationMode.STEP_BY_STEP) return SimulationMode.STEP_BY_STEP;
		return SimulationMode.CONTINUOUS;
	}

	/**
	 * @param showOnWarningsOnly Ouvre le panneau de résultats dès qu'il y a des avertissements,
	 * même sans erreur — vrai pour un clic sur "Analyser" (l'utilisateur veut voir le résultat
	 * dans tous les cas), faux pour la réanalyse automatique à l'entrée en simulation (voir
	 * `setSimulationMode`) : des avertissements n'empêchent pas de simuler, ça n'a donc pas à
	 * interrompre l'utilisateur. Une erreur ouvre le panneau dans les deux cas.
	 * @returns true if no error
	 */
	analyze(showOnWarningsOnly = true): {
		ok: boolean;
		projectAnalysisResult: ProjectAnalysisResult | null;
	} {
		const project = this.getStoreState().project;
		if (!project) return { ok: false, projectAnalysisResult: null };
		const projectAnalysisResult = ProjectAnalyser.analyse(project);
		const errors = projectAnalysisResult.issues.filter((i) => i.severity === "error");
		const warnings = projectAnalysisResult.issues.filter((i) => i.severity === "warning");

		this.notifier.analysisCompleted({
			analysedElements: projectAnalysisResult.totalAnalysedElements,
			errors: errors.length,
			warnings: warnings.length,
		});

		this.setStoreState((state) => ({
			analysisHasErrors: errors.length > 0,
			analysisHasWarnings: warnings.length > 0,
			analysisErrors: AnalysisIssuesMapper.analyserToApp(errors),
			analysisWarnings: AnalysisIssuesMapper.analyserToApp(warnings),
			ui: {
				...state.ui,
				analysisResultVisible: errors.length > 0 || (showOnWarningsOnly && warnings.length > 0),
			},
		}));

		return { ok: errors.length === 0, projectAnalysisResult };
	}

	setDesignMode() {
		this.stopSimulation();
		this.getStoreState().hmiManager.closeHmiSimulationPage();
		this.setStoreState(() => ({ mode: ProjectMode.DESIGN }));
	}

	setSimulationMode() {
		if (this.plc) this.stopSimulation();

		const project = this.getStoreState().project;
		if (!project) return;

		//Reanalyze project when switching to simulation mode
		const { ok: analysisOK, projectAnalysisResult } = this.analyze(false);
		if (!analysisOK || !projectAnalysisResult) return;

		//Pre compile the project
		const projectPreCompilationResult = ProjectPreCompiler.preCompile(
			project,
			projectAnalysisResult.generatedVariables,
			project.dialect,
		);
		if (projectPreCompilationResult.errors.length > 0) {
			this.notifier.simulationCouldNotStart({
				step: "pre-compilation",
				errorsCount: projectPreCompilationResult.errors.length,
			});
			console.error("Errors during project pre-compilation:", projectPreCompilationResult.errors);
			return;
		}

		//Compile the project
		const projectCompilationResult = ProjectCompiler.compile(projectPreCompilationResult.result!);
		if (projectCompilationResult.errors.length > 0) {
			this.notifier.simulationCouldNotStart({
				step: "compilation",
				errorsCount: projectCompilationResult.errors.length,
			});
			console.error("Errors during project compilation:", projectCompilationResult.errors);
			return;
		}
		this.notifier.simulationStarting();

		//We register each transition expression to be evaluated during simulation,
		// with the transition id as expression id
		//Fonctionnalité propre au GRAFCET : afficher l'état des réceptivités. On ne s'intéresse
		//donc qu'aux programmes de cette notation, sans supposer qu'il n'y en a pas d'autres.
		const watchedExpressions = new Map<string, ASTNode>();
		Object.values(projectPreCompilationResult.result!.programs)
			.filter(isPreCompiledGrafcet)
			.forEach((g) =>
				g.transitions.forEach((transition, transitionId) => {
					//L'AST pré-compilé est déjà analysé et simplifié
					watchedExpressions.set(transitionId, transition.node);
				}),
			);
		this.expressionsWatcher = new ExpressionsWatcher(this.getStoreState().plcConfig.scanTimeMs);
		this.expressionsWatcher.watch(watchedExpressions);

		//Create a PLC instance
		this.plc = this.createPLC(projectCompilationResult);
		this.plc.start();

		//En mode pas-à-pas, on passe immédiatement en pause : aucun cycle ne s'exécute
		//avant que l'utilisateur ne clique "Avancer d'un cycle".
		const simulationMode = this.getStoreState().simulationMode;
		const startPaused = simulationMode === SimulationMode.STEP_BY_STEP;
		if (startPaused) {
			this.plc.pause();
		}

		//Set the mode
		this.setStoreState(() => ({
			mode: ProjectMode.SIMULATION,
			simulationPaused: startPaused,
		}));
		this.getStoreState().hmiManager.openHmiSimulationPageIfAny();
	}

	pauseSimulation(): void {
		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;
		if (!this.plc) return;
		this.plc.pause();
		this.setStoreState(() => ({ simulationPaused: true }));
	}

	resumeSimulation(): void {
		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;
		if (!this.plc) return;
		this.plc.resume();
		this.setStoreState(() => ({ simulationPaused: false }));
	}

	stepSimulation(): void {
		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;
		if (!this.plc) return;
		this.plc.stepOnce();
	}

	setPlcSimulationMode(mode: SimulationMode): void {
		if (typeof window !== "undefined") {
			localStorage.setItem(SIMULATION_MODE_STORAGE_KEY, mode);
		}
		this.setStoreState(() => ({ simulationMode: mode }));

		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;

		if (mode === SimulationMode.STEP_BY_STEP && !this.plc?.isPaused()) {
			this.pauseSimulation();
		} else if (mode === SimulationMode.CONTINUOUS && this.plc?.isPaused()) {
			this.resumeSimulation();
		}
	}

	private createPLC(projectCompilationResult: ProjectCompilationResult): PLC {
		if (!projectCompilationResult.result) {
			throw new Error("No compiled project result provided");
		}
		if (!projectCompilationResult.result.routines || !projectCompilationResult.result.variables) {
			throw new Error("Compiled project result must include routines and variables");
		}
		const scanTimeMs = this.getStoreState().plcConfig.scanTimeMs;
		if (!scanTimeMs || scanTimeMs <= 0) {
			throw new Error("Invalid PLC scan time configuration");
		}
		const plc = new PLC({
			scanTimeMs,
			program: projectCompilationResult.result!.routines,
			routinesById: projectCompilationResult.result!.routinesById,
			variables: projectCompilationResult.result!.variables,
			onCycleEnd: (plcInstance) => {
				const variablesSnapshot = plcInstance.getVariablesSnapshot();
				const variablesState: Record<string, SimulationVariableState> = {};
				variablesSnapshot.forEach((v) => {
					variablesState[v.getId()] = {
						id: v.getId(),
						mnemonic: v.getName(),
						value: v.getValue(),
					};
				});
				this.expressionsWatcher?.evaluate(variablesSnapshot);
				this.setStoreState(() => ({
					simulationVariablesStates: variablesState,
					evaluableExpressionsValues: this.expressionsWatcher?.getValuesSnapshot() ?? {},
				}));
			},
			//L'erreur est déjà journalisée par le PLC lui-même (voir PLC.tick)
			onCycleError: () => {
				this.notifier.simulationCrashed();
				this.setDesignMode();
			},
		});
		return plc;
	}

	private stopSimulation(): void {
		//Stop the PLC if it is running or paused
		if (this.plc) {
			this.plc.releaseAllVariables();
			this.plc.stop();
			this.plc = null;
		}

		//Reset simulation variables states
		this.setStoreState(() => ({
			simulationVariablesStates: {},
			evaluableExpressionsValues: {},
			simulationPaused: false,
			forcedVariables: {},
		}));

		this.expressionsWatcher?.clear();
		this.expressionsWatcher = null;
	}

	public setPhysicalInputValue(variableId: string, value: any): void {
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.SIMULATION) {
			throw new Error("Cannot set physical input value when not in simulation mode");
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		this.plc.setPhysicalInputValueById(variableId, value);
	}

	public setMemoryValue(variableId: string, value: any): void {
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.SIMULATION) {
			throw new Error("Cannot set memory value when not in simulation mode");
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		this.plc.setMemoryValueById(variableId, value);
	}

	public forceVariable(variableId: string, value: any): void {
		if (!this.plc) return;
		this.plc.forceVariable(variableId, value);
		this.setStoreState((state) => ({
			forcedVariables: { ...state.forcedVariables, [variableId]: value },
		}));
	}

	public releaseVariable(variableId: string): void {
		if (!this.plc) return;
		this.plc.releaseVariable(variableId);
		this.setStoreState((state) => {
			const next = { ...state.forcedVariables };
			delete next[variableId];
			return { forcedVariables: next };
		});
	}
}
