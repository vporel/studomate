import Project from "@/schemas/project/Project.class";
import { GrafcetStoreState } from "../grafcet/grafcet-store-types";
import CommandsStackManager from "./managers/CommandsStackManager.class";
import GrafcetsManager from "./managers/GrafcetsManager.class";
import ModeManager from "./managers/ModeManager.class";
import PagesManager from "./managers/PagesManager.class";
import SimulationManager from "./managers/SimulationManager.class";
import VariablesManager from "./managers/VariablesManager.class";
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

type GrafcetStoreActions = Pick<GrafcetStoreState, "selectAllNodesAndEdges">;

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
	analysisOK: boolean | undefined; //undefined when no analysis has been done, true if the last analysis was successful, false if it failed
	simulationManager: SimulationManager;

	//=============== COMMANDS ===============
	hasCommandsToUndo: boolean;
	hasCommandsToRedo: boolean;
	commandsStackManager: CommandsStackManager;

	//=============== GRAFCETS ===============
	/**
	 * The grafcet stores values, indexed by grafcetId, to be able to update some components that are out of the grafcet context
	 */
	grafcetsStoresValues: Record<string, ProjectGrafcetStoreValues>;
	grafcetsStoresManagers: Record<string, ProjectGrafcetStoreManagers>; //The managers are used to call functions that are not pure actions, for example the copyCutPasteManager to copy and paste elements
	grafcetsStoresActions: Record<string, GrafcetStoreActions>; //The actions directly exposed by the grafcets stores
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
