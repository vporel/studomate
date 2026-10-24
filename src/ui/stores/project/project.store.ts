import { Dialect } from "@/expression-language/dialect.enum";
import { canEdit } from "./editability";
import { getSceneDescriptor } from "@/3d-scenes/scene.registry";
import { planMissingVariables } from "@/3d-scenes/scene3d-wiring";
import { localizeMnemonic } from "@/templates/localize-project";
import ProjectFieldSetCommand from "@/schemas/project/commands/project-field-set.command";
import ProjectDialectSetCommand from "@/schemas/project/commands/project-dialect-set.command";
import { createStore } from "zustand";
import { createClipboardStore } from "@/ui/stores/shared/clipboard.store";
import VariablesCommandsFactory from "./factories/variables-commands.factory";
import ProjectCommandsStackManager from "./managers/commands-stack.manager";
import GrafcetsManager from "./managers/grafcets.manager";
import LaddersManager from "./managers/ladders.manager";
import PagesManager from "./managers/pages.manager";
import HmiManager from "./managers/hmi.manager";
import ProjectLifecycleManager from "./managers/lifecycle.manager";
import ProjectSharingManager from "./managers/sharing.manager";
import { emptyAnalysisIssues } from "@/bridge/analysis-issues.mapper";
import ModeManager from "./managers/mode.manager";
import HardwareLinkManager from "./managers/hardware-link/hardware-link.manager";
import {
	DISCONNECTED_HARDWARE_LINK,
	IDLE_HARDWARE_FIRMWARE,
	IDLE_HARDWARE_OBSERVATION,
	IDLE_HARDWARE_UPLOAD,
} from "./managers/hardware-link/hardware-link.state";
import Scene3dLinkManager from "./managers/3d-scene/scene3d-link.manager";
import SimulationManager from "./managers/simulation/simulation.manager";
import VariablesManager from "./managers/variables.manager";
import { ProjectMode } from "./ProjectMode.enum";
import type { ProjectStoreEnvironment } from "./environment/project-store-environment";
import UNAVAILABLE_REPOSITORY from "./environment/unavailable-repository";
import unavailableRemoteIoDevice from "./environment/unavailable-remote-io-device";
import { performRedo, performUndo } from "./undo-redo";
import { getInitialPagesData } from "./pages-session-restore";
import { getT } from "@/ui/i18n/translateGlobal";
import {
	ProjectStoreState,
	ProjectUiState,
	ScopeType,
} from "./project.store.types";
import { PROJECT_STARTUP_PAGE_ID } from "@/ui/stores/project/pages-data";

/** Clés de `ProjectUiState` portant un simple `boolean` de visibilité. */
type BooleanUiKey = {
	[K in keyof ProjectUiState]: ProjectUiState[K] extends boolean ? K : never;
}[keyof ProjectUiState];

export type {
	PageType,
	ScopeType,
	PageData,
	GrafcetStoreValues,
	GrafcetStoreManagers,
	LadderStoreValues,
	LadderStoreManagers,
	HmiStoreValues,
	HmiStoreManagers,
	PLCConfig,
	SimulationVariableState,
	ObservableValueState,
	ProjectUiState,
	ProjectBootStatus,
	ProjectStoreState,
	ProjectStoreSetFunction,
	ProjectStoreGetFunction,
} from "./project.store.types";

export const createProjectStore = (env: ProjectStoreEnvironment) => {
	return createStore<ProjectStoreState>((set, get) => {
		const lifecycleManager = new ProjectLifecycleManager(set, get, env);

		/** Ouvre une modale, en intercalant le dialogue « modifications non enregistrées »
		 * si besoin. `discardDraft` supprime le brouillon quand l'utilisateur continue sans
		 * enregistrer — à ne faire que si l'action quitte le projet (ouvrir/nouveau), pas pour
		 * l'export où le projet reste ouvert. `message` non nul personnalise le dialogue. */
		const openWithUnsavedGuard = (
			uiKey: BooleanUiKey,
			{
				discardDraft = false,
				message = null,
			}: { discardDraft?: boolean; message?: string | null } = {},
		) => {
			if (!get().hasUnsavedChanges) {
				set((state) => ({ ui: { ...state.ui, [uiKey]: true } }));
				return;
			}
			set((state) => ({
				ui: {
					...state.ui,
					unsavedChangesDialogVisible: true,
					unsavedChangesDialogMessage: message,
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => {
						const project = get().project;
						if (discardDraft && project)
							env.persistence?.drafts.delete(project.id);
						set((state) => ({ ui: { ...state.ui, [uiKey]: true } }));
					},
				},
			}));
		};

		/** Setter d'un drapeau de visibilité simple de `ui` (sans logique de garde). */
		const modalSetter = (key: BooleanUiKey) => (visible: boolean) =>
			set((state) => ({ ui: { ...state.ui, [key]: visible } }));

		return {
			project: null,
			bootStatus: env.persistence?.initialBootStatus() ?? "idle",
			clipboard: createClipboardStore(),
			capabilities: {
				...env.capabilities,
				hardware: env.hardware !== undefined,
			},
			editingEnabled: true,
			setEditingEnabled: (enabled) => set(() => ({ editingEnabled: enabled })),
			hasUnsavedChanges: false,
			autoSaveUnavailable: false,
			ui: {
				unsavedChangesDialogVisible: false,
				unsavedChangesDialogMessage: null,
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: null,
				openModalVisible: false,
				newProjectModalVisible: false,
				exportModalVisible: false,
				saveAsModalVisible: false,
				shareModalVisible: false,
				shareRequiresCloudModalVisible: false,
				analysisResultVisible: false,
				crossReferenceResultVisible: false,
				watchTablesVisible: false,
				draftConflictModal: {
					visible: false,
					projectId: null,
					draftData: null,
				},
				cloudConflictModalVisible: false,
				saveLocationModalVisible: false,
				onSaveLocationChosen: null,
			},
			savingProject: false,
			projectRepository: env.persistence?.repository ?? UNAVAILABLE_REPOSITORY,
			isSharedProject: false,
			shareToken: null,
			pendingShareAfterAuth: false,
			activeScope: "project",
			activeScopeType: "project",
			variablesManager: new VariablesManager(set, get),
			lifecycleManager,
			sharingManager: new ProjectSharingManager(set, get, env),

			getProject: () => get().project,
			finishBoot: () => set(() => ({ bootStatus: "idle" })),

			setProjectName: (newName: string) => {
				const project = get().project;
				if (!project) return;
				if (project.name === newName) return;
				get().commandsStackManager.executeOperation([
					new ProjectFieldSetCommand({
						field: "name",
						newValue: newName,
						oldValue: project.name,
					}),
				]);
			},

			setProjectAuthor: (newAuthor: string) => {
				const project = get().project;
				if (!project) return;
				if (project.author === newAuthor) return;
				get().commandsStackManager.executeOperation([
					new ProjectFieldSetCommand({
						field: "author",
						newValue: newAuthor,
						oldValue: project.author,
					}),
				]);
			},

			setProjectDialect: (dialect: Dialect) => {
				const project = get().project;
				if (!project) return;
				if (project.dialect === dialect) return;
				get().commandsStackManager.executeOperation([
					new ProjectDialectSetCommand({
						newDialect: dialect,
						oldDialect: project.dialect,
					}),
				]);
			},

			setExerciseStatement: (statement: string) => {
				const project = get().project;
				if (!project) return;
				const trimmed = statement.trim();
				const next = trimmed.length > 0 ? { statement } : undefined;
				if (project.exercise?.statement === next?.statement) return;
				get().commandsStackManager.executeOperation([
					new ProjectFieldSetCommand({
						field: "exercise",
						newValue: next,
						oldValue: project.exercise,
					}),
				]);
			},

			setHardwareModel: (modelId) => {
				const project = get().project;
				if (!project) return;
				const current = project.hardwareTarget ?? null;
				if ((current?.modelId ?? null) === modelId) return;
				void get().hardwareLinkManager.unlink();
				get().commandsStackManager.executeOperation([
					new ProjectFieldSetCommand({
						field: "hardwareTarget",
						newValue: modelId ? { modelId } : null,
						oldValue: current,
					}),
				]);
			},

			setHardwareTarget: (target) => {
				const project = get().project;
				if (!project?.hardwareTarget) return;
				get().commandsStackManager.executeOperation([
					new ProjectFieldSetCommand({
						field: "hardwareTarget",
						newValue: target,
						oldValue: project.hardwareTarget,
					}),
				]);
			},

			setScene3d: (scene) => {
				const project = get().project;
				if (!project) return;
				if (scene && scene.sceneId !== project.scene3d?.sceneId) {
					env.analytics.trackEvent("scene-attached", { scene: scene.sceneId });
				}
				get().commandsStackManager.executeOperation([
					new ProjectFieldSetCommand({
						field: "scene3d",
						newValue: scene,
						oldValue: project.scene3d ?? null,
					}),
				]);
			},

			createMissingScene3dVariables: () => {
				const project = get().project;
				const scene = project?.scene3d;
				if (!project || !scene || !canEdit(get())) return;
				const descriptor = getSceneDescriptor(
					scene.sceneId,
					scene.sceneVersion,
				);
				if (!descriptor) return;
				const locale = project.dialect === Dialect.EN ? "en" : "fr";
				const plan = planMissingVariables(
					descriptor,
					scene,
					project.variables,
					(mnemonic) => localizeMnemonic(mnemonic, locale),
				);
				const { commands, variablesToAdd } =
					VariablesCommandsFactory.onAddVariable(
						project,
						plan.toCreate.map(({ fields }) => fields),
					);
				const bindings = { ...scene.bindings, ...plan.reused };
				for (const { pointId, fields } of plan.toCreate) {
					const variable = variablesToAdd.find(
						(v) => v.mnemonic === fields.mnemonic,
					);
					if (variable) bindings[pointId] = variable.id;
				}
				get().commandsStackManager.executeOperation([
					...commands,
					new ProjectFieldSetCommand({
						field: "scene3d",
						newValue: { ...scene, bindings },
						oldValue: scene,
					}),
				]);
			},

			setUnsavedChangesDialogVisible: modalSetter(
				"unsavedChangesDialogVisible",
			),
			setNewProjectModalVisible: modalSetter("newProjectModalVisible"),
			setSaveAsModalVisible: modalSetter("saveAsModalVisible"),
			setShareModalVisible: modalSetter("shareModalVisible"),
			setShareRequiresCloudModalVisible: modalSetter(
				"shareRequiresCloudModalVisible",
			),

			setOpenModalVisible: (visible: boolean) => {
				if (!visible) {
					set((state) => ({ ui: { ...state.ui, openModalVisible: false } }));
					return;
				}
				openWithUnsavedGuard("openModalVisible", { discardDraft: true });
			},

			setExportModalVisible: (visible: boolean) => {
				if (!visible) {
					set((state) => ({ ui: { ...state.ui, exportModalVisible: false } }));
					return;
				}
				openWithUnsavedGuard("exportModalVisible", {
					message: getT("projects.unsavedChanges")("exportMessage"),
				});
			},

			setActiveScope: (scope: string) => {
				const previousScope = get().activeScope;
				const pagesData = get().pagesData;
				let scopeType: ScopeType = "project";
				if (scope && pagesData[scope]) {
					if (pagesData[scope].type === "grafcet") {
						scopeType = "grafcet";
					} else if (pagesData[scope].type === "ladder") {
						scopeType = "ladder";
					} else if (pagesData[scope].type === "hmi") {
						scopeType = "hmi";
					}
				}
				set(() => ({ activeScope: scope, activeScopeType: scopeType }));
				//If the scope is a grafcet, set the focus on the grafcet flow
				//Prevent the focus change if the scope didn't change, to avoid issues with the grafcet flow shortcuts when the user clicks on the flow while it's already active
				if (scope && previousScope !== scope && scopeType === "grafcet") {
					get().grafcetsManager.getActiveStoreManagers()?.viewManager.focus();
				}
			},

			//=============== SIMULATION ===============
			mode: ProjectMode.DESIGN,
			simulationPaused: false,
			simulationMode: env.preferences.getSimulationMode(),
			simulationKind: "virtual",
			scene3dDrivenInputIds: [],
			analysisHasErrors: false,
			analysisHasWarnings: false,
			analysisErrors: emptyAnalysisIssues(),
			analysisWarnings: emptyAnalysisIssues(),
			// Panneaux latéraux mutuellement exclusifs : ouvrir l'un ferme l'autre.
			setAnalysisResultVisible: (visible) =>
				set((state) => ({
					ui: {
						...state.ui,
						analysisResultVisible: visible,
						crossReferenceResultVisible: visible
							? false
							: state.ui.crossReferenceResultVisible,
					},
				})),
			setCrossReferenceResultVisible: (visible) =>
				set((state) => ({
					ui: {
						...state.ui,
						crossReferenceResultVisible: visible,
						analysisResultVisible: visible
							? false
							: state.ui.analysisResultVisible,
					},
				})),
			crossReferenceFilter: "",
			setCrossReferenceFilter: (filter) =>
				set(() => ({ crossReferenceFilter: filter })),
			variableToReveal: null,
			setVariableToReveal: (variableId) =>
				set(() => ({ variableToReveal: variableId })),
			setWatchTablesVisible: modalSetter("watchTablesVisible"),
			plcConfig: {
				scanTimeMs: 100,
			},
			simulationVariablesStates: {},
			simulationVariablesStatesByMnemonic: {},
			observableExpressionsValues: {},
			forcedVariables: {},
			simulationManager: new SimulationManager(set, get, env),

			//=============== HARDWARE LINK ===============
			hardwareLink: DISCONNECTED_HARDWARE_LINK,
			hardwareLinkManager: new HardwareLinkManager(
				set,
				get,
				env.hardwareNotifier,
				env.hardware?.createDevice ?? unavailableRemoteIoDevice,
			),
			scene3dLinkManager: new Scene3dLinkManager(env.createScene3dHost(get)),
			hardwareFirmware: IDLE_HARDWARE_FIRMWARE,
			hardwareUpload: IDLE_HARDWARE_UPLOAD,
			hardwareObservation: IDLE_HARDWARE_OBSERVATION,
			modeManager: new ModeManager(get),

			//=============== COMMANDS STACK ===============
			hasCommandsToUndo: false,
			hasCommandsToRedo: false,
			commandsStackManager: new ProjectCommandsStackManager(set, get),
			undoActiveScope: () => performUndo(get()),
			redoActiveScope: () => performRedo(get()),

			//=============== GRAFCETS ===============
			grafcetsStoresValues: {},
			grafcetsStoresManagers: {},
			grafcetsManager: new GrafcetsManager(set, get, env.analytics),

			//=============== LADDERS ===============
			laddersStoresValues: {},
			laddersStoresManagers: {},
			laddersManager: new LaddersManager(set, get, env.analytics),

			//=============== HMI ===============
			hmiStoresValues: {},
			hmiStoresManagers: {},
			hmiManager: new HmiManager(set, get, env.analytics),
			hmiSimulationActivePageId: null,

			//=============== PAGES ===============
			pagesData: getInitialPagesData(),
			pagesOrder: [PROJECT_STARTUP_PAGE_ID],
			activePageId: PROJECT_STARTUP_PAGE_ID,
			pagesManager: new PagesManager(set, get, env.persistence),
		};
	});
};
