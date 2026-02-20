import Grafcet from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";
import { GrafcetStoreState } from "../grafcet/grafcet-store-types";

type SimpleCallback = () => void;

export type PageType = "project-startup" | "project-properties" | "grafcet";

export type ScopeType = "project" | PageType;

type PageData = {
	id: string;
	type: PageType;
	title: string;
};

type GrafcetStoreValues = Pick<GrafcetStoreState, "hasCommandsToUndo" | "hasCommandsToRedo">;

type GrafcetStoreActions = Pick<
	GrafcetStoreState,
	| "getZoom"
	| "zoomIn"
	| "zoomOut"
	| "fitView"
	| "selectAllNodesAndEdges"
	| "copySelectedElements"
	| "pasteCopiedElements"
	| "undoOperation"
	| "redoOperation"
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
	activeScope: string | null; //The currently active scope (used for keyboard shortcuts). The scope can be defined by an objectId (for example, the grafcetId of the currently active grafcet)
	activeScopeType: ScopeType | null;

	openProject: (projectId: string) => Promise<boolean>; // Returns true if a project was opened, false if cancelled or failed
	newProject: () => Promise<void>;
	saveProject: () => Promise<boolean | null>; // Returns true if saved, false if not saved (error), null if cancelled
	closeProject: () => void;

	setProjectName: (newName: string) => void;
	setProjectAuthor: (newAuthor: string) => void;

	setUnsavedChangesDialogVisible: (visible: boolean) => void;
	setOpenModalVisible: (visible: boolean) => void;
	setExportModalVisible: (visible: boolean) => void;
	setActiveScope: (scope: string | null) => void;

	//Grafcets
	/**
	 * The grafcet stores values, indexed by grafcetId, to be able to update some components that are out of the grafcet context
	 */
	grafcetsStoresValues: Record<string, ProjectGrafcetStoreValues>;
	/**
	 * The grafcet stores actions, indexed by grafcetId, to be able to call some grafcet store methods that are out of the grafcet context, for example to implement the project keyboard shortcuts
	 */
	grafcetsStoresActions: Record<string, GrafcetStoreActions>;
	getActiveGrafcetStoreValues: () => GrafcetStoreValues | null; //Returns the grafcet store values of the currently active grafcet, or null if there is no active grafcet
	setGrafcetStoreValues: (grafcetId: string, values: GrafcetStoreValues) => void;
	/**
	 * This method should be called one by the grafcet store to register its actions
	 */
	registerGrafcetStoreActions: (grafcetId: string, actions: GrafcetStoreActions) => void;
	getActiveGrafcetStoreActions: () => GrafcetStoreActions | null; //Returns the grafcet store actions of the currently active grafcet, or null if there is no active grafcet
	deleteGrafcetStoreActions: (grafcetId: string) => void; //To be called when a grafcet is deleted to clean up the store
	newGrafcet: (name: string, format: GrafcetFormat) => void;
	updateGrafcetData: (grafcet: Grafcet) => void;
	deleteGrafcet: (grafcetId: string) => void;
	renameGrafcet: (grafcetId: string, newName: string) => void;
	getGrafcet: (grafcetId: string) => Grafcet;

	//Pages
	pagesData: Record<string, PageData>;
	pagesOrder: string[]; //The ids of the pages in the order they are displayed
	activePageId: string | null; //The id of the currently active page, or null if no page is active
	openPage: (pageData: PageData) => void;
	closePage: (pageId: string) => void;
	setActivePage: (pageId: string) => void;

	//Miscellaneous
	mousePosition: { x: number; y: number };
}
