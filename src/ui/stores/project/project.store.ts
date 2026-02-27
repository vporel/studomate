import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/project.schema";
import { createRandomId } from "@/schemas/utils/ids";
import { PROJECT_STARTUP_PAGE_DATA, PROJECT_STARTUP_PAGE_ID } from "@/ui/components/pages/ProjectStartupPage";
import { localStorageGetProject, localStorageSaveProject } from "@/ui/local-storage/projects";
import { getStubProject } from "@/ui/utils/project/project-utils";
import { createStore } from "zustand";
import { focusFlow } from "../grafcet/flow-management";
import { GrafcetStoreState } from "../grafcet/grafcet.store";
import CommandsStackManager from "./managers/commands-stack.manager";
import GrafcetsManager from "./managers/grafcets.manager";
import ModeManager from "./managers/mode.manager";
import PagesManager from "./managers/pages.manager";
import SimulationManager, {
	AnalysisIssues,
	emptyAnalysisIssues,
} from "./managers/simulation/simulation.manager";
import VariablesManager from "./managers/variables.manager";
import { ProjectMode } from "./ProjectMode.enum";

type SimpleCallback = () => void;

export type PageType = "project-startup" | "project-properties" | "grafcet" | "variables";

/**
 * The variables are managed in the project scope
 */
export type ScopeType = "project" | "grafcet";

type PageData = {
	id: string;
	type: PageType;
	title: string;
};

type GrafcetStoreValues = Pick<GrafcetStoreState, "hasCommandsToUndo" | "hasCommandsToRedo">;

type GrafcetStoreManagers = Pick<
	GrafcetStoreState,
	"viewManager" | "copyCutPasteManager" | "commandsStackManager"
>;

export interface ProjectStoreState {
	//Project
	project: Project | null; //null when no project is opened
	hasUnsavedChanges: boolean;
	unsavedChangesDialogVisible: boolean;
	unsavedChangesDialogMessage: string | null;
	onUnsavedChangesDialogCancel: SimpleCallback | null;
	onUnsavedChangesDialogContinue: SimpleCallback | null;
	openModalVisible: boolean;
	exportModalVisible: boolean;
	savingProject: boolean;
	activeScope: string; //The currently active scope (used for keyboard shortcuts). The scope can be defined by an objectId (for example, the grafcetId of the currently active grafcet)
	activeScopeType: ScopeType;
	variablesManager: VariablesManager;

	getProject: () => Project | null;
	openProject: (projectId: string) => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	newProject: () => Promise<void>;
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	closeProject: () => void;

	setProjectName: (newName: string) => void;
	setProjectAuthor: (newAuthor: string) => void;

	setUnsavedChangesDialogVisible: (visible: boolean) => void;
	setOpenModalVisible: (visible: boolean) => void;
	setExportModalVisible: (visible: boolean) => void;
	setActiveScope: (scope: string) => void;

	//=============== MODE ===============
	mode: ProjectMode;
	modeManager: ModeManager;

	//=============== SIMULATION ===============
	analysisHasErrors: boolean;
	analysisHasWarnings: boolean;
	analysisErrors: AnalysisIssues;
	analysisWarnings: AnalysisIssues;
	analysisResultVisible: boolean; // UI: whether the analysis errors panel is visible
	setAnalysisResultVisible: (visible: boolean) => void;
	simulationManager: SimulationManager;

	//=============== COMMANDS ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: CommandsStackManager;

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

	//=============== MISCELLANEOUS ===============
	mousePosition: { x: number; y: number };
}

export type ProjectStoreSetFunction = (
	partial:
		| ProjectStoreState
		| Partial<ProjectStoreState>
		| ((partial: Partial<ProjectStoreState>) => ProjectStoreState | Partial<ProjectStoreState>),
) => void;

export type ProjectStoreGetFunction = () => ProjectStoreState;

function getInitialPagesData(project: Project | null): Record<string, PageData> {
	const pagesData: Record<string, PageData> = {};
	pagesData[PROJECT_STARTUP_PAGE_ID] = PROJECT_STARTUP_PAGE_DATA;

	return pagesData;
}

export const createProjectStore = () => {
	const _openProject = async (set: ProjectStoreSetFunction, project: Project) => {
		const initialPagesData = getInitialPagesData(project);
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

	const _newProject = async (set: ProjectStoreSetFunction) => {
		const newProject = new Project(createRandomId(), DEFAULT_PROJECT_NAME, "");
		_openProject(set, newProject);
	};

	const _closeProject = async (set: ProjectStoreSetFunction) => {
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
		project: getStubProject(),
		hasUnsavedChanges: false,
		unsavedChangesDialogVisible: false,
		unsavedChangesDialogMessage: null,
		openModalVisible: false,
		exportModalVisible: false,
		onUnsavedChangesDialogCancel: null,
		onUnsavedChangesDialogContinue: null,
		savingProject: false,
		activeScope: "project",
		activeScopeType: "project",
		variablesManager: new VariablesManager(set, get),

		getProject: () => get().project,
		openProject: async (projectId: string) => {
			const project = localStorageGetProject(projectId);
			if (!project) return false;
			await _openProject(set, project);
			return true;
		},

		newProject: async () => {
			if (!get().hasUnsavedChanges) {
				await _newProject(set);
				return;
			}
			set(() => ({
				unsavedChangesDialogVisible: true,
				unsavedChangesDialogMessage: null,
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: () => {
					_newProject(set);
				},
			}));
		},

		saveProject: async () => {
			const project = get().project;
			if (!project) return false;
			const newProject = project.copy();
			newProject.touch(); //Update the project's last modified date
			set(() => ({ savingProject: true }));
			//Save the project in the local storage
			localStorageSaveProject(newProject);
			set(() => ({ project: newProject, hasUnsavedChanges: false, savingProject: false }));
			return true;
		},

		closeProject: async () => {
			if (!get().hasUnsavedChanges) {
				_closeProject(set);
				return;
			}
			set(() => ({
				unsavedChangesDialogVisible: true,
				unsavedChangesDialogMessage: null,
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: () => {
					_closeProject(set);
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

		setUnsavedChangesDialogVisible: (visible: boolean) => {
			set(() => ({ unsavedChangesDialogVisible: visible }));
		},

		setOpenModalVisible: (visible: boolean) => {
			if (!visible) {
				set(() => ({ openModalVisible: false }));
				return;
			}
			if (!get().hasUnsavedChanges) {
				set(() => ({ openModalVisible: true }));
			} else {
				set(() => ({
					unsavedChangesDialogVisible: true,
					unsavedChangesDialogMessage: null,
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => set(() => ({ openModalVisible: true })),
				}));
			}
		},

		setExportModalVisible: (visible: boolean) => {
			if (!visible) {
				set(() => ({ exportModalVisible: false }));
				return;
			}
			if (!get().hasUnsavedChanges) {
				set(() => ({ exportModalVisible: true }));
			} else {
				set(() => ({
					unsavedChangesDialogVisible: true,
					unsavedChangesDialogMessage:
						"Vous avez des modifications non enregistrées. Voulez-vous les enregistrer avant d'exporter ?",
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => set(() => ({ exportModalVisible: true })),
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

		//=============== MODE ===============
		mode: ProjectMode.DESIGN,
		modeManager: new ModeManager(set, get),

		//=============== SIMULATION ===============
		analysisHasErrors: false,
		analysisHasWarnings: false,
		analysisErrors: emptyAnalysisIssues(),
		analysisWarnings: emptyAnalysisIssues(),
		analysisResultVisible: false,
		setAnalysisResultVisible: (visible: boolean) => {
			set(() => ({ analysisResultVisible: visible }));
		},
		simulationManager: new SimulationManager(set, get),

		//=============== COMMANDS STACK ===============
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		commandsStackManager: new CommandsStackManager(set, get),

		//=============== GRAFCETS ===============
		grafcetsStoresValues: {},
		grafcetsStoresActions: {},
		grafcetsStoresManagers: {},
		grafcetsManager: new GrafcetsManager(set, get),

		//=============== PAGES ===============
		pagesData: getInitialPagesData(null),
		pagesOrder: [PROJECT_STARTUP_PAGE_ID],
		activePageId: PROJECT_STARTUP_PAGE_ID,
		pagesManager: new PagesManager(set, get),

		//=============== MISCELLANEOUS ===============
		mousePosition: { x: 0, y: 0 },
	}));
};
