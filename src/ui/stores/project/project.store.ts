import { Dialect } from "@/expression-language/dialect.enum";
import HybridProjectRepository from "@/persistence/repositories/hybrid.project.repository";
import { createStore } from "zustand";
import ProjectCommandsStackManager from "./managers/commands-stack.manager";
import GrafcetsManager from "./managers/grafcets.manager";
import LaddersManager from "./managers/ladders.manager";
import PagesManager from "./managers/pages.manager";
import HmiManager from "./managers/hmi.manager";
import ProjectLifecycleManager from "./managers/lifecycle.manager";
import ProjectSharingManager from "./managers/sharing.manager";
import { emptyAnalysisIssues } from "@/bridge/analysis-issues.mapper";
import SimulationManager from "./managers/simulation/simulation.manager";
import ToastSimulationNotifier from "./managers/simulation/toast.simulation.notifier";
import VariablesManager from "./managers/variables.manager";
import { ProjectMode } from "./ProjectMode.enum";
import {
	getProjectIdFromUrl,
	getShareTokenFromUrl,
} from "@/ui/lib/project-url";
import { performRedo, performUndo } from "./undo-redo";
import { getInitialPagesData } from "./pages-session-restore";
import { deleteDraft } from "@/persistence/draft.storage";
import { PROJECT_STARTUP_PAGE_ID } from "@/ui/components/pages/ProjectStartupPage";
import {
	ProjectStoreState,
	ProjectUiState,
	ScopeType,
} from "./project.store.types";

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
	ProjectUiState,
	ProjectBootStatus,
	ProjectStoreState,
	ProjectStoreSetFunction,
	ProjectStoreGetFunction,
} from "./project.store.types";

export const createProjectStore = () => {
	return createStore<ProjectStoreState>((set, get) => {
		const lifecycleManager = new ProjectLifecycleManager(set, get);

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
						if (discardDraft && project) deleteDraft(project.id);
						set((state) => ({ ui: { ...state.ui, [uiKey]: true } }));
					},
				},
			}));
		};

		/** Setter d'un drapeau de visibilité simple de `ui` (sans logique de garde). */
		const modalSetter =
			(key: BooleanUiKey) => (visible: boolean) =>
				set((state) => ({ ui: { ...state.ui, [key]: visible } }));

		return {
			project: null,
			bootStatus:
				getProjectIdFromUrl() || getShareTokenFromUrl() ? "restoring" : "idle",
			hasUnsavedChanges: false,
			ui: {
				unsavedChangesDialogVisible: false,
				unsavedChangesDialogMessage: null,
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: null,
				openModalVisible: false,
				newProjectModalVisible: false,
				exportModalVisible: false,
				pdfExportModalVisible: false,
				saveAsModalVisible: false,
				shareModalVisible: false,
				shareRequiresCloudModalVisible: false,
				analysisResultVisible: false,
				watchTablesVisible: false,
				draftConflictModal: {
					visible: false,
					projectId: null,
					draftData: null,
				},
			},
			savingProject: false,
			projectRepository: new HybridProjectRepository(),
			isSharedProject: false,
			shareToken: null,
			pendingShareAfterAuth: false,
			activeScope: "project",
			activeScopeType: "project",
			variablesManager: new VariablesManager(set, get),
			lifecycleManager,
			sharingManager: new ProjectSharingManager(set, get),

			getProject: () => get().project,
			finishBoot: () => set(() => ({ bootStatus: "idle" })),

			setProjectName: (newName: string) => {
				const project = get().project;
				if (!project) return;
				if (project.name === newName) return; //No change
				set(() => {
					const newProject = project.copy();
					newProject.name = newName;
					return { project: newProject, hasUnsavedChanges: true };
				});
			},

			setProjectAuthor: (newAuthor: string) => {
				const project = get().project;
				if (!project) return;
				if (project.author === newAuthor) return; //No change
				set(() => {
					const newProject = project.copy();
					newProject.author = newAuthor;
					return { project: newProject, hasUnsavedChanges: true };
				});
			},

			setProjectDialect: (dialect: Dialect) => {
				const project = get().project;
				if (!project) return;
				if (project.dialect === dialect) return;
				set(() => {
					const newProject = project.copy();
					//Traduit les mots-clés des expressions existantes : sans quoi elles deviendraient
					//illisibles dans le nouveau dialecte
					newProject.setDialect(dialect);
					return { project: newProject, hasUnsavedChanges: true };
				});
				//Les grafcets ouverts détiennent leur propre copie : ils doivent adopter la nouvelle
				get().grafcetsManager.syncMountedStoresFromProject();
			},

			setUnsavedChangesDialogVisible: modalSetter("unsavedChangesDialogVisible"),
			setNewProjectModalVisible: modalSetter("newProjectModalVisible"),
			setPdfExportModalVisible: modalSetter("pdfExportModalVisible"),
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
					message:
						"Vous avez des modifications non enregistrées. Voulez-vous les enregistrer avant d'exporter ?",
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
			simulationMode: SimulationManager.getPersistedSimulationMode(),
			analysisHasErrors: false,
			analysisHasWarnings: false,
			analysisErrors: emptyAnalysisIssues(),
			analysisWarnings: emptyAnalysisIssues(),
			setAnalysisResultVisible: modalSetter("analysisResultVisible"),
			setWatchTablesVisible: modalSetter("watchTablesVisible"),
			plcConfig: {
				scanTimeMs: 100,
			},
			simulationVariablesStates: {},
			evaluableExpressionsValues: {},
			forcedVariables: {},
			simulationManager: new SimulationManager(
				set,
				get,
				new ToastSimulationNotifier(),
			),

			//=============== COMMANDS STACK ===============
			hasCommandsToUndo: false,
			hasCommandsToRedo: false,
			commandsStackManager: new ProjectCommandsStackManager(set, get),
			undoActiveScope: () => performUndo(get()),
			redoActiveScope: () => performRedo(get()),

			//=============== GRAFCETS ===============
			grafcetsStoresValues: {},
			grafcetsStoresManagers: {},
			grafcetsManager: new GrafcetsManager(set, get),

			//=============== LADDERS ===============
			laddersStoresValues: {},
			laddersStoresManagers: {},
			laddersManager: new LaddersManager(set, get),

			//=============== HMI ===============
			hmiStoresValues: {},
			hmiStoresManagers: {},
			hmiManager: new HmiManager(set, get),
			hmiSimulationActivePageId: null,

			//=============== PAGES ===============
			pagesData: getInitialPagesData(),
			pagesOrder: [PROJECT_STARTUP_PAGE_ID],
			activePageId: PROJECT_STARTUP_PAGE_ID,
			pagesManager: new PagesManager(set, get),
		};
	});
};
