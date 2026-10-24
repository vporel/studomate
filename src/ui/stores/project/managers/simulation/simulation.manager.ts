import AnalysisIssuesMapper from "@/bridge/analysis-issues.mapper";
import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import ProjectAnalyser, {
	ProjectAnalysisResult,
} from "@/project-analyser/project.analyser";
import ProjectCompiler, {
	ProjectCompilationResult,
} from "@/project-compiler/project.compiler";
import ProjectPreCompiler from "@/project-pre-compiler/project.pre-compiler";
import PLC from "@/simulator/core/plc/plc";
import type { CompiledProject } from "@/project-compiler/project.compiler";
import PLCVariable, {
	PLCVariableValue,
} from "@/simulator/core/plc/plc-variable";
import {
	ObservableValueState,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	SimulationVariableState,
} from "@/ui/stores/project/project.store";
import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { SimulationMode } from "@/ui/stores/project/SimulationMode.enum";
import type { SimulationManagerEnvironment } from "@/ui/stores/project/environment/project-store-environment";
import BoardMirror from "./board-mirror";
import Scene3dSimulationBridge, {
	type Scene3dStateSnapshot,
} from "../3d-scene/scene3d-simulation.bridge";
import type { SimulationKind } from "@/ui/stores/project/SimulationKind";

export default class SimulationManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	private plc: PLC | null = null;
	/** Set while the interface follows the program a board runs, instead of a local PLC. */
	private mirror: BoardMirror | null = null;

	/**
	 * Id de variable de mémoire (portant une valeur observable) → propriétaire (transition) et
	 * étiquette (`null` pour l'état booléen évalué, un nom pour une valeur nommée type temps
	 * écoulé de tempo). Construite depuis `CompiledProject.observableExpressionVariableIds` au
	 * démarrage : `publishCycleState` s'en sert pour aiguiller la valeur de ces variables vers
	 * `observableExpressionsValues[ownerId]` et les exclure de `simulationVariablesStates`.
	 */
	private observationVariableToSource: Map<
		string,
		{ ownerId: string; label: string | null }
	> = new Map();

	/** Variables the compilation generates for its own bookkeeping: never published. */
	private internalVariableIds: Set<string> = new Set();

	/**
	 * Dernier ensemble complet des entrées observables publiées par propriétaire (transition),
	 * maintenu à jour à chaque changement pour republier un tableau complet et cohérent (pas
	 * seulement l'entrée qui a changé) sans avoir à relire tout l'état courant du PLC.
	 */
	private currentObservableEntries: Map<string, Map<string | null, unknown>> =
		new Map();

	/**
	 * Dernières valeurs publiées dans le store (par id de variable), pour ne republier à chaque
	 * cycle que ce qui a changé. `null` tant qu'aucun cycle n'a été publié.
	 */
	private lastPublishedValues: Map<string, unknown> | null = null;

	private readonly scene3dBridge = new Scene3dSimulationBridge({
		getProject: () => this.getStoreState().project,
		applyExternalInputs: (values) => this.applyExternalInputs(values),
	});

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
		private readonly env: SimulationManagerEnvironment,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	private get notifier() {
		return this.env.simulationNotifier;
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

		const automatic = !showOnWarningsOnly;
		if (!automatic || errors.length > 0 || warnings.length > 0)
			this.notifier.analysisCompleted({
				analysedElements: projectAnalysisResult.totalAnalysedElements,
				errors: errors.length,
				warnings: warnings.length,
			});

		this.setStoreState((state) => ({
			analysisHasErrors: errors.length > 0,
			analysisHasWarnings: warnings.length > 0,
			analysisErrors: AnalysisIssuesMapper.analyserToApp(
				errors,
				this.env.getLocale(),
			),
			analysisWarnings: AnalysisIssuesMapper.analyserToApp(
				warnings,
				this.env.getLocale(),
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
		void this.getStoreState().hardwareLinkManager.onModeSettled();
	}

	/** Changes what the simulation in progress is made of, without restarting it. */
	setSimulationKind(kind: SimulationKind): void {
		this.setStoreState(() => ({ simulationKind: kind }));
	}

	/**
	 * Starts a simulation with the local PLC. `hardware-io` has the pins of the linked board serve
	 * as inputs and outputs (the caller has put the board in that state first). True when the
	 * simulation started.
	 */
	setSimulationMode(kind: "virtual" | "hardware-io" = "virtual"): boolean {
		if (this.plc || this.mirror) this.stopSimulation();

		const project = this.getStoreState().project;
		if (!project) return false;

		//Reanalyze project when switching to simulation mode
		const { ok: analysisOK, projectAnalysisResult } = this.analyze(false);
		if (!analysisOK || !projectAnalysisResult) return false;

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
			return false;
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
			return false;
		}
		this.notifier.simulationStarting();

		this.registerObservations(projectCompilationResult.result!);
		this.registerInternalVariables(projectCompilationResult.result!);

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
		this.setStoreState(() => ({ simulationKind: kind }));
		this.getStoreState().hardwareLinkManager.onSimulationStart();
		this.scene3dBridge.onSimulationStart(startPaused);
		this.setStoreState(() => ({
			scene3dDrivenInputIds: this.scene3dBridge.drivenVariableIds(),
		}));
		this.plc.pause();
		this.plc.stepOnce();
		// A failing establishing cycle has already notified the crash and torn the PLC down.
		if (!this.plc) return false;
		if (!startPaused) {
			this.plc.resume();
		}

		//Set the mode
		this.setStoreState(() => ({
			mode: ProjectMode.SIMULATION,
			simulationPaused: startPaused,
		}));
		this.env.analytics.trackEvent("simulation-started", {
			mode: simulationMode,
			hardware: kind !== "virtual",
			scene3d: Boolean(this.getStoreState().project?.scene3d),
		});
		if (this.env.preferences.getAutoOpenHmiSimulationOnStart())
			this.openSimulationView();
		void this.getStoreState().hardwareLinkManager.onModeSettled();
		return true;
	}

	/**
	 * Shows what the user simulates: the main HMI page when the project has one, otherwise the
	 * tab of its 3D scene.
	 */
	private openSimulationView(): void {
		const { project, hmiManager, scene3dLinkManager } = this.getStoreState();
		if (hmiManager.openHmiSimulationPageIfAny()) return;
		const scene = project?.scene3d;
		if (scene && getSceneDescriptor(scene.sceneId, scene.sceneVersion)) {
			if (!scene3dLinkManager.open()) {
				this.notifier.scene3dOpenBlocked(() => scene3dLinkManager.open());
			}
		}
	}

	/**
	 * Valeurs observables (état des réceptivités pour le surlignage, temps écoulé des tempos
	 * nommées...) : la routine d'observation compilée écrit ces valeurs dans des variables de
	 * mémoire, on retient juste l'association variable → (propriétaire, étiquette) pour la
	 * publication.
	 */
	private registerObservations(compiled: CompiledProject): void {
		this.observationVariableToSource = new Map();
		for (const [ownerId, refs] of Object.entries(
			compiled.observableExpressionVariableIds,
		)) {
			for (const ref of refs) {
				this.observationVariableToSource.set(ref.variableId, {
					ownerId,
					label: ref.label,
				});
			}
		}
		this.currentObservableEntries = new Map();
	}

	private registerInternalVariables(compiled: CompiledProject): void {
		this.internalVariableIds = new Set(
			compiled.variables
				.filter((variable) => variable.isInternal())
				.map((variable) => variable.getId()),
		);
	}

	/**
	 * Enters the simulation mode without a local PLC: the program runs on a board, and the
	 * interface shows what it reports (`publishBoardSnapshot`).
	 */
	startOnline(compiled: CompiledProject): void {
		if (this.plc || this.mirror) this.stopSimulation();
		this.registerObservations(compiled);
		this.registerInternalVariables(compiled);
		this.mirror = new BoardMirror(compiled);
		this.lastPublishedValues = null;
		this.setStoreState(() => ({
			mode: ProjectMode.SIMULATION,
			simulationPaused: false,
			simulationKind: "observation",
		}));
		if (this.env.preferences.getAutoOpenHmiSimulationOnStart()) {
			this.getStoreState().hmiManager.openHmiSimulationPageIfAny();
		}
		void this.getStoreState().hardwareLinkManager.onModeSettled();
	}

	/** Values of the variables the board reported, published as a PLC cycle would be. */
	publishBoardSnapshot(values: Record<string, boolean | number>): void {
		if (!this.mirror) return;
		this.publishCycleState(this.mirror.snapshot(values));
	}

	pauseSimulation(): void {
		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;
		if (!this.plc) return;
		this.plc.pause();
		this.setStoreState(() => ({ simulationPaused: true }));
		this.scene3dBridge.setPaused(true);
	}

	resumeSimulation(): void {
		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;
		if (!this.plc) return;
		this.plc.resume();
		this.setStoreState(() => ({ simulationPaused: false }));
		this.scene3dBridge.setPaused(false);
	}

	stepSimulation(): void {
		if (this.getStoreState().mode !== ProjectMode.SIMULATION) return;
		if (!this.plc) return;
		this.plc.stepOnce();
	}

	setPlcSimulationMode(mode: SimulationMode): void {
		this.env.preferences.setSimulationMode(mode);
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
				const snapshot = plcInstance.getVariablesSnapshot();
				this.publishCycleState(snapshot);
				this.getStoreState().hardwareLinkManager.onCycleEnd(snapshot);
				this.scene3dBridge.onCycleEnd(
					snapshot,
					plcInstance.getLastCycleDeltaMs(),
				);
			},
			//L'erreur est déjà journalisée par le PLC lui-même (voir PLC.tick)
			heartbeat: this.env.heartbeat,
			onCycleError: (error) => {
				this.notifier.simulationCrashed(
					SimulatorExceptionsMapper.getUserFriendlyMessage(
						error,
						this.env.getLocale(),
					),
				);
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

		const changedVariables: Record<string, SimulationVariableState> = {};
		const changedVariablesByMnemonic: Record<string, SimulationVariableState> =
			{};
		const changedOwnerIds = new Set<string>();
		for (const v of variablesSnapshot) {
			const id = v.getId();
			const value = v.getValue();

			const source = this.observationVariableToSource.get(id);
			if (source !== undefined) {
				//Variable observable (réceptivité, temps écoulé de tempo...) : n'apparaît pas dans
				//les variables de simulation, sa valeur alimente l'état des valeurs observées de
				//son propriétaire.
				if (
					!this.lastPublishedValues.has(id) ||
					!Object.is(this.lastPublishedValues.get(id), value)
				) {
					this.lastPublishedValues.set(id, value);
					let ownerEntries = this.currentObservableEntries.get(source.ownerId);
					if (!ownerEntries) {
						ownerEntries = new Map();
						this.currentObservableEntries.set(source.ownerId, ownerEntries);
					}
					ownerEntries.set(source.label, value);
					changedOwnerIds.add(source.ownerId);
				}
				continue;
			}
			if (this.internalVariableIds.has(id)) continue;

			if (
				!this.lastPublishedValues.has(id) ||
				!Object.is(this.lastPublishedValues.get(id), value)
			) {
				const entry = { id, mnemonic: v.getName(), value };
				changedVariables[id] = entry;
				changedVariablesByMnemonic[v.getName()] = entry;
				this.lastPublishedValues.set(id, value);
			}
		}

		const hasVarChanges = Object.keys(changedVariables).length > 0;
		const hasObservableChanges = changedOwnerIds.size > 0;
		if (!hasVarChanges && !hasObservableChanges) return;

		const changedObservableValues: Record<string, ObservableValueState[]> = {};
		for (const ownerId of changedOwnerIds) {
			changedObservableValues[ownerId] = Array.from(
				this.currentObservableEntries.get(ownerId)!,
				([label, value]) => ({ label, value }),
			);
		}

		this.setStoreState((state) => ({
			...(hasVarChanges
				? {
						simulationVariablesStates: {
							...state.simulationVariablesStates,
							...changedVariables,
						},
						simulationVariablesStatesByMnemonic: {
							...state.simulationVariablesStatesByMnemonic,
							...changedVariablesByMnemonic,
						},
					}
				: {}),
			...(hasObservableChanges
				? {
						observableExpressionsValues: {
							...state.observableExpressionsValues,
							...changedObservableValues,
						},
					}
				: {}),
		}));
	}

	private stopSimulation(): void {
		//Leave the board as the simulation found it (pins released, observation over)
		this.mirror = null;
		void this.getStoreState().hardwareLinkManager.onSimulationStop();

		//Stop the PLC if it is running or paused
		if (this.plc) {
			this.plc.releaseAllVariables();
			this.plc.stop();
			this.plc = null;
		}

		//Les sorties de la carte liée ne doivent pas rester dans le dernier état du PLC
		this.getStoreState().hardwareLinkManager.fallback();
		this.scene3dBridge.onSimulationStop();

		//Reset simulation variables states
		this.lastPublishedValues = null;
		this.setStoreState(() => ({
			simulationVariablesStates: {},
			simulationVariablesStatesByMnemonic: {},
			observableExpressionsValues: {},
			simulationPaused: false,
			simulationKind: "virtual",
			scene3dDrivenInputIds: [],
			forcedVariables: {},
		}));

		this.observationVariableToSource = new Map();
		this.internalVariableIds = new Set();
		this.currentObservableEntries = new Map();
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
		if (this.mirror) {
			//Un pin de la carte reste la source de vérité de son entrée
			if (
				!this.getStoreState().hardwareLink.drivenInputIds.includes(variableId)
			) {
				this.writeToBoard(variableId, value);
			}
			return;
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		//La broche (ou le capteur de la scène 3D) est la source de vérité de son entrée
		if (
			this.getStoreState().hardwareLink.drivenInputIds.includes(variableId) ||
			this.scene3dBridge.drives(variableId)
		) {
			return;
		}
		const coerced = this.coerceToPlcType(variableId, value);
		if (coerced === undefined) return;
		const stored = this.plc.setPhysicalInputValueById(variableId, coerced);
		this.publishImmediateValue(variableId, stored);
	}

	/**
	 * Valeurs venues d'une source externe (broches de la carte liée, capteurs d'une scène 3D),
	 * écrites dans les entrées physiques du PLC. Sans simulation en cours, rien à faire : chaque
	 * source rejoue ses dernières valeurs au démarrage de la simulation.
	 */
	public applyExternalInputs(
		values: ReadonlyMap<string, boolean | number>,
	): void {
		if (!this.plc) return;
		for (const [variableId, value] of values) {
			const coerced = this.coerceToPlcType(variableId, value);
			if (coerced === undefined) continue;
			this.publishImmediateValue(
				variableId,
				this.plc.setPhysicalInputValueById(variableId, coerced),
			);
		}
	}

	/** Interaction of the user inside the 3D scene, applied at the end of the next PLC cycle. */
	public sendScene3dInteraction(interaction: unknown): void {
		this.scene3dBridge.queueInteraction(interaction);
	}

	public subscribeScene3d(
		listener: Parameters<Scene3dSimulationBridge["subscribe"]>[0],
	): () => void {
		return this.scene3dBridge.subscribe(listener);
	}

	public getScene3dSnapshot(): Scene3dStateSnapshot | null {
		return this.scene3dBridge.getSnapshot();
	}

	private isReadOnlyVariable(variableId: string): boolean {
		return (
			this.getStoreState()
				.project?.variables.find((variable) => variable.id === variableId)
				?.isReadOnly() ?? false
		);
	}

	public setMemoryValue(variableId: string, value: any): void {
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.SIMULATION) {
			throw new Error("Cannot set memory value when not in simulation mode");
		}
		if (this.isReadOnlyVariable(variableId)) return;
		if (this.mirror) {
			this.writeToBoard(variableId, value);
			return;
		}
		if (!this.plc) {
			throw new Error("PLC instance is not initialized");
		}
		const coerced = this.coerceToPlcType(variableId, value);
		if (coerced === undefined) return;
		const stored = this.plc.setMemoryValueById(variableId, coerced);
		this.publishImmediateValue(variableId, stored);
	}

	/**
	 * Répercute immédiatement dans le store la valeur qu'on vient d'écrire dans le PLC, sans
	 * attendre `onCycleEnd`. Nécessaire pour les entrées physiques : `setPhysicalInputValueById`
	 * n'écrit que le buffer `physicalInputs`, relu dans l'image d'entrée (publiée par
	 * `publishCycleState`) seulement au prochain tick — qui n'arrive qu'au prochain "Avancer" en
	 * pas-à-pas. Sans ce court-circuit, la table de visualisation semblerait ne pas réagir à la
	 * saisie tant que la simulation est en pause.
	 */
	private publishImmediateValue(
		variableId: string,
		value: PLCVariableValue,
	): void {
		const mnemonic = this.plc?.getVariableNameById(variableId);
		if (mnemonic === undefined) return;
		this.lastPublishedValues?.set(variableId, value);
		const entry: SimulationVariableState = { id: variableId, mnemonic, value };
		this.setStoreState((state) => ({
			simulationVariablesStates: {
				...state.simulationVariablesStates,
				[variableId]: entry,
			},
			simulationVariablesStatesByMnemonic: {
				...state.simulationVariablesStatesByMnemonic,
				[mnemonic]: entry,
			},
		}));
	}

	/** Writes a value, once, to a variable of the program a board runs. */
	private writeToBoard(variableId: string, value: unknown): void {
		const name = this.mirror?.nameOf(variableId);
		const numeric = toBoardValue(value);
		if (name === undefined || numeric === undefined) return;
		void this.getStoreState().hardwareLinkManager.writeBoardVariable(
			name,
			numeric,
		);
	}

	public forceVariable(variableId: string, value: any): void {
		if (this.isReadOnlyVariable(variableId)) return;
		if (this.mirror) {
			const name = this.mirror.nameOf(variableId);
			const numeric = toBoardValue(value);
			if (name === undefined || numeric === undefined) return;
			void this.getStoreState().hardwareLinkManager.forceBoardVariable(
				name,
				numeric,
			);
			this.setStoreState((state) => ({
				forcedVariables: { ...state.forcedVariables, [variableId]: numeric },
			}));
			return;
		}
		if (!this.plc) return;
		const coerced = this.coerceToPlcType(variableId, value);
		if (coerced === undefined) return;
		this.plc.forceVariable(variableId, coerced);
		this.setStoreState((state) => ({
			forcedVariables: { ...state.forcedVariables, [variableId]: coerced },
		}));
	}

	public releaseVariable(variableId: string): void {
		if (this.mirror) {
			const name = this.mirror.nameOf(variableId);
			if (name === undefined) return;
			void this.getStoreState().hardwareLinkManager.releaseBoardVariable(name);
			this.setStoreState((state) => {
				const next = { ...state.forcedVariables };
				delete next[variableId];
				return { forcedVariables: next };
			});
			return;
		}
		if (!this.plc) return;
		this.plc.releaseVariable(variableId);
		this.setStoreState((state) => {
			const next = { ...state.forcedVariables };
			delete next[variableId];
			return { forcedVariables: next };
		});
	}
}

/** A value from the interface as the board takes it: a number, a boolean being 0 or 1. */
function toBoardValue(value: unknown): boolean | number | undefined {
	if (typeof value === "boolean") return value;
	const numeric = typeof value === "number" ? value : Number(value);
	return Number.isFinite(numeric) ? Math.trunc(numeric) : undefined;
}
