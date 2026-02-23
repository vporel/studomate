import { PROJECT_STARTUP_PAGE_DATA, PROJECT_STARTUP_PAGE_ID } from "@/components/pages/ProjectStartupPage";
import { localStorageGetProject, localStorageSaveProject } from "@/local-storage/projects";
import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/Project.class";
import { createRandomId } from "@/schemas/schemas-helpers";
import { getStubProject } from "@/utils/project/project-utils";
import { createStore } from "zustand";
import { focusFlow } from "../grafcet/flow-management";
import CommandsStackManager from "./managers/CommandsStackManager.class";
import GrafcetsManager from "./managers/GrafcetsManager.class";
import PagesManager from "./managers/PagesManager.class";
import VariablesManager from "./managers/VariablesManager.class";
import { PageData, ProjectStoreSetFunction, ProjectStoreState, ScopeType } from "./project-store-types";

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
		hasCommandsToUndo: false,
		hasCommandsToRedo: false,
		commandsStackManager: new CommandsStackManager(set, get),
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
