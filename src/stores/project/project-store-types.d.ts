import Grafcet from "@/schemas/grafcet/Grafcet.class";
import Project from "@/schemas/project/Project.class";

type SimpleCallback = () => void;

export type PageType = "project-startup" | "project-properties" | "grafcet";

export type ScopeType = "project" | PageType;

type PageData = {
	id: string;
	type: PageType;
	title: string;
};

type GrafcetFlowData = {
	nodes: GrafcetNode[];
	edges: GrafcetEdge[];
};

export interface ProjectStoreState {
	//Project
	project: Project | null; //null when no project is opened
	hasUnsavedChanges: boolean;
	unsavedChangesDialogVisible: boolean;
	onUnsavedChangesDialogCancel: SimpleCallback | null;
	onUnsavedChangesDialogContinue: SimpleCallback | null;
	openModalVisible: boolean;
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
	setActiveScope: (scope: string | null) => void;

	//Grafcets
	_grafcetsFlowsData: Record<string, GrafcetFlowData>; //The data of the grafcet flows, indexed by grafcet id
	newGrafcet: (name: string, format: GrafcetFormat) => void;
	updateGrafcetData: (grafcet: Grafcet) => void;
	deleteGrafcet: (grafcetId: string) => void;
	renameGrafcet: (grafcetId: string, newName: string) => void;
	updateGrafcetFlowData: (grafcetId: string, data: GrafcetFlowData) => void;
	getGrafcetFlowData: (grafcetId: string) => GrafcetFlowData | undefined;
	getGrafcet: (grafcetId: string) => Grafcet;

	//Pages
	pagesData: Record<string, PageData>;
	pagesOrder: string[]; //The ids of the pages in the order they are displayed
	activePageId: string | null; //The id of the currently active page, or null if no page is active
	openPage: (pageData: PageData) => void;
	closePage: (pageId: string) => void;
	setActivePage: (pageId: string) => void;
}
