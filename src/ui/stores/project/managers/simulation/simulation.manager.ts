import AnalysisIssuesMapper from "@/bridge/analysis-issues.mapper";
import ProjectAnalyser, { ProjectAnalysisResult } from "@/project-analyser/project.analyser";
import ProjectCompiler, { ProjectCompilationResult } from "@/project-compiler/project.compiler";
import { isPreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import { ASTNode } from "@/simulator/compiler/ast/nodes/ast-node";
import PLC from "@/simulator/core/plc/plc";
import ExpressionsWatcher from "@/simulator/runtime/expressions-watcher";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	SimulationVariableState,
} from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import SimulationNotifier from "./simulation.notifier";

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

	/**
	 *
	 * @returns true if no error
	 */
	analyze(): {
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

		this.setStoreState(() => ({
			analysisHasErrors: errors.length > 0,
			analysisHasWarnings: warnings.length > 0,
			analysisErrors: AnalysisIssuesMapper.analyserToApp(errors),
			analysisWarnings: AnalysisIssuesMapper.analyserToApp(warnings),
			analysisResultVisible: errors.length > 0 || warnings.length > 0,
		}));

		return { ok: errors.length === 0, projectAnalysisResult };
	}

	setDesignMode() {
		this.stopSimulation();
		this.setStoreState(() => ({ mode: ProjectMode.DESIGN }));
	}

	setSimulationMode() {
		const project = this.getStoreState().project;
		if (!project) return;

		//Reanalyze project when switching to simulation mode
		const { ok: analysisOK, projectAnalysisResult } = this.analyze();
		if (!analysisOK || !projectAnalysisResult) return;

		//Pre compile the project
		const projectPreCompilationResult = ProjectPreCompiler.preCompile(
			project,
			projectAnalysisResult.stepsVariables,
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

		//We register each transition expression to be evaluated during simulation,
		// with the transition id as expression id
		//Fonctionnalité propre au GRAFCET : afficher l'état des réceptivités. On ne s'intéresse
		//donc qu'aux programmes de cette notation, sans supposer qu'il n'y en a pas d'autres.
		const watchedExpressions = new Map<string, ASTNode>();
		Object.values(projectPreCompilationResult.result!.programs)
			.filter(isPreCompiledGrafcet)
			.forEach((g) =>
				g.transitions.entries().forEach(([transitionId, transition]) => {
					//L'AST pré-compilé est déjà analysé et simplifié
					watchedExpressions.set(transitionId, transition.node);
				}),
			);
		this.expressionsWatcher = new ExpressionsWatcher(this.getStoreState().plcConfig.scanTimeMs);
		this.expressionsWatcher.watch(watchedExpressions);

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

		//Create a PLC instance
		this.plc = this.createPLC(projectCompilationResult);
		this.plc.start();

		//Set the mode
		this.setStoreState(() => ({ mode: ProjectMode.SIMULATION, watchTablesVisible: true }));
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
		//Stop the PLC if it is running
		if (this.plc) {
			this.plc.stop();
			this.plc = null;
		}

		//Reset simulation variables states
		this.setStoreState(() => ({
			simulationVariablesStates: {},
			evaluableExpressionsValues: {},
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
}
