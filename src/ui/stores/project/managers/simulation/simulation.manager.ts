import AnalysisIssuesMapper from "@/bridge/analysis-issues.mapper";
import { resolveUiLocale } from "@/persistence/preferences.storage";
import ProjectAnalyser, {
	ProjectAnalysisResult,
} from "@/project-analyser/project.analyser";
import ProjectCompiler, {
	ProjectCompilationResult,
} from "@/project-compiler/project.compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import PLC from "@/simulator/core/plc/plc";
import PLCVariable, {
	PLCVariableValue,
} from "@/simulator/core/plc/plc-variable";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	SimulationVariableState,
} from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import trackEvent from "@/ui/lib/analytics";
import SimulationNotifier from "./simulation.notifier";

const SIMULATION_MODE_STORAGE_KEY = "studomate:simulationMode";

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	private plc: PLC | null = null;

	/**
	 * Id de variable de mémoire (portant l'état d'une réceptivité observée) → id de la transition
	 * correspondante. Construite depuis `CompiledProject.evaluableExpressionVariableIds` au
	 * démarrage : `publishCycleState` s'en sert pour aiguiller la valeur de ces variables vers
	 * `evaluableExpressionsValues[transitionId]` et les exclure de `simulationVariablesStates`.
	 */
	private observationVariableToSource: Map<string, string> = new Map();

	/**
	 * Dernières valeurs publiées dans le store (par id de variable / d'expression observée), pour
	 * ne republier à chaque cycle que ce qui a changé. `null` tant qu'aucun cycle n'a été publié.
	 */
	private lastPublishedValues: Map<string, unknown> | null = null;
	private lastPublishedExprValues: Map<string, unknown> | null = null;

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
		if (stored === SimulationMode.STEP_BY_STEP)
			return SimulationMode.STEP_BY_STEP;
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
		const errors = projectAnalysisResult.issues.filter(
			(i) => i.severity === "error",
		);
		const warnings = projectAnalysisResult.issues.filter(
			(i) => i.severity === "warning",
		);

		this.notifier.analysisCompleted({
			analysedElements: projectAnalysisResult.totalAnalysedElements,
			errors: errors.length,
			warnings: warnings.length,
		});

		this.setStoreState((state) => ({
			analysisHasErrors: errors.length > 0,
			analysisHasWarnings: warnings.length > 0,
			analysisErrors: AnalysisIssuesMapper.analyserToApp(errors, resolveUiLocale()),
			analysisWarnings: AnalysisIssuesMapper.analyserToApp(
				warnings,
				resolveUiLocale(),
			),
			ui: {
				...state.ui,
				analysisResultVisible:
					errors.length > 0 || (showOnWarningsOnly && warnings.length > 0),
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
			console.error(
				"Errors during project pre-compilation:",
				projectPreCompilationResult.errors,
			);
			return;
		}

		//Compile the project
		const projectCompilationResult = ProjectCompiler.compile(
			projectPreCompilationResult.result!,
		);
		if (projectCompilationResult.errors.length > 0) {
			this.notifier.simulationCouldNotStart({
				step: "compilation",
				errorsCount: projectCompilationResult.errors.length,
			});
			console.error(
				"Errors during project compilation:",
				projectCompilationResult.errors,
			);
			return;
		}
		this.notifier.simulationStarting();

		//État des réceptivités (surlignage des transitions franchissables) : la routine
		//d'observation compilée écrit ces valeurs dans des variables de mémoire, on retient
		//juste l'association variable → transition pour la publication.
		this.observationVariableToSource = new Map(
			Object.entries(
				projectCompilationResult.result!.evaluableExpressionVariableIds,
			).map(([sourceId, variableId]) => [variableId, sourceId]),
		);

		//Create a PLC instance
		this.plc = this.createPLC(projectCompilationResult);
		this.plc.start();

		//Cycle d'établissement : exécuté synchronement à l'entrée en simulation pour que la
		//situation initiale (étapes initiales actives, sorties calculées) soit publiée avant
		//tout affichage — sinon, en pas-à-pas, aucun cycle ne tourne jusqu'au premier
		//"Avancer" et l'interface montre un grafcet sans étape active. `deltaTimeMs` vaut 0
		//sur ce cycle : aucune temporisation n'avance.
		const simulationMode = this.getStoreState().simulationMode;
		const startPaused = simulationMode === SimulationMode.STEP_BY_STEP;
		this.plc.pause();
		this.plc.stepOnce();
		if (!startPaused) {
			this.plc.resume();
		}

		//Set the mode
		this.setStoreState(() => ({
			mode: ProjectMode.SIMULATION,
			simulationPaused: startPaused,
		}));
		trackEvent("simulation-started", { mode: simulationMode });
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
		if (
			!projectCompilationResult.result.routines ||
			!projectCompilationResult.result.variables
		) {
			throw new Error(
				"Compiled project result must include routines and variables",
			);
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
				this.publishCycleState(plcInstance.getVariablesSnapshot());
			},
			//L'erreur est déjà journalisée par le PLC lui-même (voir PLC.tick)
			onCycleError: () => {
				this.notifier.simulationCrashed();
				this.setDesignMode();
			},
		});
		return plc;
	}

	/**
	 * Publie dans le store uniquement les variables (et réceptivités observées) dont la valeur a
	 * changé depuis le cycle précédent. En régime établi peu de bits basculent par cycle : les
	 * abonnés dont la variable n'a pas bougé ne sont pas réveillés, et si rien n'a changé le
	 * store n'est pas touché du tout.
	 */
	private publishCycleState(variablesSnapshot: readonly PLCVariable[]): void {
		if (!this.lastPublishedValues) this.lastPublishedValues = new Map();
		if (!this.lastPublishedExprValues) this.lastPublishedExprValues = new Map();

		const changedVariables: Record<string, SimulationVariableState> = {};
		const changedExprValues: Record<string, unknown> = {};
		for (const v of variablesSnapshot) {
			const id = v.getId();
			const value = v.getValue();

			const sourceId = this.observationVariableToSource.get(id);
			if (sourceId !== undefined) {
				//Variable d'observation d'une réceptivité : n'apparaît pas dans les variables de
				//simulation, sa valeur alimente l'état des expressions évaluables.
				if (
					!this.lastPublishedExprValues.has(sourceId) ||
					!Object.is(this.lastPublishedExprValues.get(sourceId), value)
				) {
					changedExprValues[sourceId] = value;
					this.lastPublishedExprValues.set(sourceId, value);
				}
				continue;
			}

			if (
				!this.lastPublishedValues.has(id) ||
				!Object.is(this.lastPublishedValues.get(id), value)
			) {
				changedVariables[id] = { id, mnemonic: v.getName(), value };
				this.lastPublishedValues.set(id, value);
			}
		}

		const hasVarChanges = Object.keys(changedVariables).length > 0;
		const hasExprChanges = Object.keys(changedExprValues).length > 0;
		if (!hasVarChanges && !hasExprChanges) return;

		this.setStoreState((state) => ({
			...(hasVarChanges
				? {
						simulationVariablesStates: {
							...state.simulationVariablesStates,
							...changedVariables,
						},
					}
				: {}),
			...(hasExprChanges
				? {
						evaluableExpressionsValues: {
							...state.evaluableExpressionsValues,
							...changedExprValues,
						},
					}
				: {}),
		}));
	}

	private stopSimulation(): void {
		//Stop the PLC if it is running or paused
		if (this.plc) {
			this.plc.releaseAllVariables();
			this.plc.stop();
			this.plc = null;
		}

		//Reset simulation variables states
		this.lastPublishedValues = null;
		this.lastPublishedExprValues = null;
		this.setStoreState(() => ({
			simulationVariablesStates: {},
			evaluableExpressionsValues: {},
			simulationPaused: false,
			forcedVariables: {},
		}));

		this.observationVariableToSource = new Map();
	}

	/**
	 * Ramène une valeur venue de l'UI (`any`) au type natif de la variable ciblée. `undefined`
	 * si la variable est inconnue du PLC ou si un nombre attendu n'est pas fini — l'appelant
	 * n'écrit alors rien, plutôt que de laisser `PLCVariable.setValue` lever et détruire la
	 * simulation au cycle suivant.
	 */
	private coerceToPlcType(
		variableId: string,
		value: unknown,
	): PLCVariableValue | undefined {
		const type = this.plc?.getVariableTypeById(variableId);
		if (!type) return undefined;
		if (type === "boolean") return typeof value === "boolean" ? value : !!value;
		if (type === "number") {
			const n = typeof value === "number" ? value : Number(value);
			return Number.isFinite(n) ? n : undefined;
		}
		return typeof value === "string" ? value : String(value);
	}

	public setPhysicalInputValue(variableId: string, value: any): void {
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.SIMULATION) {
			throw new Error(
				"Cannot set physical input value when not in simulation mode",
			);
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		const coerced = this.coerceToPlcType(variableId, value);
		if (coerced === undefined) return;
		this.plc.setPhysicalInputValueById(variableId, coerced);
	}

	public setMemoryValue(variableId: string, value: any): void {
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.SIMULATION) {
			throw new Error("Cannot set memory value when not in simulation mode");
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		const coerced = this.coerceToPlcType(variableId, value);
		if (coerced === undefined) return;
		this.plc.setMemoryValueById(variableId, coerced);
	}

	public forceVariable(variableId: string, value: any): void {
		if (!this.plc) return;
		const coerced = this.coerceToPlcType(variableId, value);
		if (coerced === undefined) return;
		this.plc.forceVariable(variableId, coerced);
		this.setStoreState((state) => ({
			forcedVariables: { ...state.forcedVariables, [variableId]: coerced },
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
