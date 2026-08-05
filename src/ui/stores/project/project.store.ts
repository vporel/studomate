import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/project.schema";
import { createRandomId } from "@/schemas/utils/ids";
import { PROJECT_STARTUP_PAGE_DATA, PROJECT_STARTUP_PAGE_ID } from "@/ui/components/pages/ProjectStartupPage";
import { Dialect } from "@/expression-language/dialect.enum";
import LocalStorageProjectRepository from "@/persistence/repositories/local-storage.project.repository";
import ProjectRepository, { SaveFailureReason } from "@/persistence/repositories/project.repository";
import { toast } from "react-toastify";
import { createStore } from "zustand";
import { focusFlow } from "../grafcet/flow-management";
import { GrafcetStoreState } from "../grafcet/grafcet.store";
import CommandsStackManager from "./managers/commands-stack.manager";
import GrafcetsManager from "./managers/grafcets.manager";
import PagesManager from "./managers/pages.manager";
import { AnalysisIssues, emptyAnalysisIssues } from "@/bridge/analysis-issues.mapper";
import SimulationManager from "./managers/simulation/simulation.manager";
import ToastSimulationNotifier from "./managers/simulation/toast.simulation.notifier";
import VariablesManager from "./managers/variables.manager";
import { ProjectMode } from "./ProjectMode.enum";
import { performRedo, performUndo } from "./undo-redo";

type SimpleCallback = () => void;

const SAVE_FAILURE_MESSAGES: Record<SaveFailureReason, string> = {
	"quota-exceeded":
		"Enregistrement impossible : l'espace de stockage du navigateur est plein. Exportez le projet dans un fichier pour ne pas perdre votre travail.",
	unavailable:
		"Enregistrement impossible : le stockage du navigateur est inaccessible (navigation privée ?). Exportez le projet dans un fichier.",
	unknown: "Enregistrement impossible. Exportez le projet dans un fichier pour ne pas perdre votre travail.",
};

export type PageType = "project-startup" | "project-properties" | "grafcet" | "variables";

/**
 * The variables are managed in the project scope
 */
export type ScopeType = "project" | "grafcet";

export type PageData = {
	id: string;
	type: PageType;
	title: string;
};

export type GrafcetStoreValues = Pick<GrafcetStoreState, "hasCommandsToUndo" | "hasCommandsToRedo">;

export type GrafcetStoreManagers = Pick<
	GrafcetStoreState,
	"viewManager" | "copyCutPasteManager" | "commandsStackManager" | "workflowManager"
>;

export type PLCConfig = {
	scanTimeMs: number;
};

export type SimulationVariableState = { id: string; mnemonic: string; value: any };

/**
 * Pure UI state: nothing here has business meaning on its own, it only reflects what's
 * currently shown on screen (dialogs, panels). Kept as one nested object rather than split
 * into its own store: the managers below already read/write it in the same `set()` calls as
 * business fields (e.g. `SimulationManager` opens the watch tables and switches to simulation
 * mode together), so a separate store would just move the mixing elsewhere.
 */
export interface ProjectUiState {
	unsavedChangesDialogVisible: boolean;
	unsavedChangesDialogMessage: string | null;
	onUnsavedChangesDialogCancel: SimpleCallback | null;
	onUnsavedChangesDialogContinue: SimpleCallback | null;
	openModalVisible: boolean;
	exportModalVisible: boolean;
	analysisResultVisible: boolean; // whether the analysis errors panel is visible
	watchTablesVisible: boolean;
}

export interface ProjectStoreState {
	//Project
	project: Project | null; //null when no project is opened
	hasUnsavedChanges: boolean;
	ui: ProjectUiState;
	savingProject: boolean;
	/**
	 * Accès au stockage. Dans le store pour rester substituable : la sauvegarde cloud de la
	 * feuille de route viendra remplacer l'implémentation sans toucher au reste.
	 */
	projectRepository: ProjectRepository;
	activeScope: string; //The currently active scope (used for keyboard shortcuts). The scope can be defined by an objectId (for example, the grafcetId of the currently active grafcet)
	activeScopeType: ScopeType;
	variablesManager: VariablesManager;

	getProject: () => Project | null;
	openProject: (projectId: string) => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	newProject: () => Promise<void>;
	saveProject: () => Promise<boolean>; // true si réellement enregistré
	closeProject: () => Promise<void>;

	setProjectName: (newName: string) => void;
	setProjectAuthor: (newAuthor: string) => void;
	setProjectDialect: (dialect: Dialect) => void;

	setUnsavedChangesDialogVisible: (visible: boolean) => void;
	setOpenModalVisible: (visible: boolean) => void;
	setExportModalVisible: (visible: boolean) => void;
	setActiveScope: (scope: string) => void;

	//=============== SIMULATION ===============
	mode: ProjectMode;
	analysisHasErrors: boolean;
	analysisHasWarnings: boolean;
	analysisErrors: AnalysisIssues;
	analysisWarnings: AnalysisIssues;
	setAnalysisResultVisible: (visible: boolean) => void;
	setWatchTablesVisible: (visible: boolean) => void;
	plcConfig: PLCConfig;
	/**
	 * The current values of the variables during simulation, used to display them in the UI
	 */
	simulationVariablesStates: Record<string, SimulationVariableState>;
	/**
	 * Current values of the expressions watched during simulation (e.g. a transition's
	 * receptivity), indexed by the id chosen when the expression was registered.
	 *
	 * Held here, in the reactive state, rather than in a private field mutated by the manager:
	 * a Zustand selector only re-runs when the piece of state it reads actually changes. It
	 * used to work only because `simulationVariablesStates` happened to change every cycle at
	 * the same time — an accidental dependency that a future optimisation could silently break.
	 */
	evaluableExpressionsValues: Record<string, unknown>;
	simulationManager: SimulationManager;

	//=============== COMMANDS ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: CommandsStackManager;
	/**
	 * Undo/redo on the active document. See `undo-redo.ts` for the scoping rule.
	 */
	undoActiveScope: () => void;
	redoActiveScope: () => void;

	//=============== GRAFCETS ===============
	/**
	 * The grafcet stores values, indexed by grafcetId, to be able to update some components that are out of the grafcet context
	 */
	grafcetsStoresValues: Record<string, GrafcetStoreValues>;
	grafcetsStoresManagers: Record<string, GrafcetStoreManagers>; //The managers are used to call functions that are not pure actions, for example the copyCutPasteManager to copy and paste elements
	grafcetsManager: GrafcetsManager;

	//=============== PAGES ===============
	pagesData: Record<string, PageData>;
	pagesOrder: string[]; //The ids of the pages in the order they are displayed
	activePageId: string | null; //The id of the currently active page, or null if no page is active
	pagesManager: PagesManager;
}

export type ProjectStoreSetFunction = (
	partial:
		| ProjectStoreState
		| Partial<ProjectStoreState>
		| ((state: ProjectStoreState) => ProjectStoreState | Partial<ProjectStoreState>),
) => void;

export type ProjectStoreGetFunction = () => ProjectStoreState;

function getInitialPagesData(): Record<string, PageData> {
	const pagesData: Record<string, PageData> = {};
	pagesData[PROJECT_STARTUP_PAGE_ID] = PROJECT_STARTUP_PAGE_DATA;

	return pagesData;
}

export const createProjectStore = () => {
	const _openProject = async (set: ProjectStoreSetFunction, get: ProjectStoreGetFunction, project: Project) => {
		//The undo histories belong to the project being left
		get().grafcetsManager.clearCommandsStacks();
		const initialPagesData = getInitialPagesData();
		set(() => ({
			project: project,
			hasUnsavedChanges: false,
			pagesData: initialPagesData,
			pagesOrder: initialPagesData ? Object.keys(initialPagesData) : [],
			activePageId: initialPagesData ? Object.keys(initialPagesData)[0] : null,
			activeScope: "project",
			activeScopeType: "project",
		}));
	};

	const _newProject = async (set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) => {
		const newProject = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
		await _openProject(set, get, newProject);
	};

	const _closeProject = async (set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) => {
		get().grafcetsManager.clearCommandsStacks();
		set(() => ({
			project: null,
			hasUnsavedChanges: false,
			pagesData: {},
			pagesOrder: [],
			activePageId: null,
			activeScope: "project",
			activeScopeType: "project",
		}));
	};

	return createStore<ProjectStoreState>((set, get) => ({
		project: null,
		hasUnsavedChanges: false,
		ui: {
			unsavedChangesDialogVisible: false,
			unsavedChangesDialogMessage: null,
			onUnsavedChangesDialogCancel: null,
			onUnsavedChangesDialogContinue: null,
			openModalVisible: false,
			exportModalVisible: false,
			analysisResultVisible: false,
			watchTablesVisible: false,
		},
		savingProject: false,
		projectRepository: new LocalStorageProjectRepository(),
		activeScope: "project",
		activeScopeType: "project",
		variablesManager: new VariablesManager(set, get),

		getProject: () => get().project,
		openProject: async (projectId: string) => {
			const project = get().projectRepository.get(projectId);
			if (!project) return false;
			await _openProject(set, get, project);
			return true;
		},

		newProject: async () => {
			if (!get().hasUnsavedChanges) {
				await _newProject(set, get);
				return;
			}
			set((state) => ({
				ui: {
					...state.ui,
					unsavedChangesDialogVisible: true,
					unsavedChangesDialogMessage: null,
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => {
						void _newProject(set, get);
					},
				},
			}));
		},

		saveProject: async () => {
			const project = get().project;
			if (!project) return false;
			const newProject = project.copy();
			newProject.touch(); //Update the project's last modified date
			set(() => ({ savingProject: true }));

			const result = get().projectRepository.save(newProject);
			if (!result.ok) {
				//Ne jamais annoncer un enregistrement qui n'a pas eu lieu : le projet reste
				//marqué comme modifié pour que l'utilisateur puisse réessayer
				set(() => ({ savingProject: false }));
				toast.error(SAVE_FAILURE_MESSAGES[result.reason]);
				console.error("Failed to save the project:", result.cause);
				return false;
			}

			set(() => ({ project: newProject, hasUnsavedChanges: false, savingProject: false }));
			return true;
		},

		closeProject: async () => {
			if (!get().hasUnsavedChanges) {
				await _closeProject(set, get);
				return;
			}
			set((state) => ({
				ui: {
					...state.ui,
					unsavedChangesDialogVisible: true,
					unsavedChangesDialogMessage: null,
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => {
						void _closeProject(set, get);
					},
				},
			}));
		},

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

		setUnsavedChangesDialogVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, unsavedChangesDialogVisible: visible } }));
		},

		setOpenModalVisible: (visible: boolean) => {
			if (!visible) {
				set((state) => ({ ui: { ...state.ui, openModalVisible: false } }));
				return;
			}
			if (!get().hasUnsavedChanges) {
				set((state) => ({ ui: { ...state.ui, openModalVisible: true } }));
			} else {
				set((state) => ({
					ui: {
						...state.ui,
						unsavedChangesDialogVisible: true,
						unsavedChangesDialogMessage: null,
						onUnsavedChangesDialogCancel: null,
						onUnsavedChangesDialogContinue: () =>
							set((state) => ({ ui: { ...state.ui, openModalVisible: true } })),
					},
				}));
			}
		},

		setExportModalVisible: (visible: boolean) => {
			if (!visible) {
				set((state) => ({ ui: { ...state.ui, exportModalVisible: false } }));
				return;
			}
			if (!get().hasUnsavedChanges) {
				set((state) => ({ ui: { ...state.ui, exportModalVisible: true } }));
			} else {
				set((state) => ({
					ui: {
						...state.ui,
						unsavedChangesDialogVisible: true,
						unsavedChangesDialogMessage:
							"Vous avez des modifications non enregistrées. Voulez-vous les enregistrer avant d'exporter ?",
						onUnsavedChangesDialogCancel: null,
						onUnsavedChangesDialogContinue: () =>
							set((state) => ({ ui: { ...state.ui, exportModalVisible: true } })),
					},
				}));
			}
		},

		setActiveScope: (scope: string) => {
			const previousScope = get().activeScope;
			const pagesData = get().pagesData;
			let scopeType: ScopeType = "project";
			if (scope && pagesData[scope]) {
				if (pagesData[scope].type === "grafcet") {
					scopeType = "grafcet";
				}
			}
			set(() => ({ activeScope: scope, activeScopeType: scopeType }));
			//If the scope is a grafcet, set the focus on the grafcet flow
			//Prevent the focus change if the scope didn't change, to avoid issues with the grafcet flow shortcuts when the user clicks on the flow while it's already active
			if (scope && previousScope !== scope && scopeType === "grafcet") {
				focusFlow(scope);
			}
		},

		//=============== SIMULATION ===============
		mode: ProjectMode.DESIGN,
		analysisHasErrors: false,
		analysisHasWarnings: false,
		analysisErrors: emptyAnalysisIssues(),
		analysisWarnings: emptyAnalysisIssues(),
		setAnalysisResultVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, analysisResultVisible: visible } }));
		},
		setWatchTablesVisible: (visible: boolean) => {
			set((state) => ({ ui: { ...state.ui, watchTablesVisible: visible } }));
		},
		plcConfig: {
			scanTimeMs: 100,
		},
		simulationVariablesStates: {},
		evaluableExpressionsValues: {},
		simulationManager: new SimulationManager(set, get, new ToastSimulationNotifier()),

		//=============== COMMANDS STACK ===============
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		commandsStackManager: new CommandsStackManager(set, get),
		undoActiveScope: () => performUndo(get()),
		redoActiveScope: () => performRedo(get()),

		//=============== GRAFCETS ===============
		grafcetsStoresValues: {},
		grafcetsStoresManagers: {},
		grafcetsManager: new GrafcetsManager(set, get),

		//=============== PAGES ===============
		pagesData: getInitialPagesData(),
		pagesOrder: [PROJECT_STARTUP_PAGE_ID],
		activePageId: PROJECT_STARTUP_PAGE_ID,
		pagesManager: new PagesManager(set, get),
	}));
};
