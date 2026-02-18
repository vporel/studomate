import { PROJECT_STARTUP_PAGE_DATA, PROJECT_STARTUP_PAGE_ID } from "@/components/pages/ProjectStartupPage";
import { deepObjectsComparison } from "@/lib/object";
import { localStorageGetProject, localStorageSaveProject } from "@/local-storage/projects";
import CommandsStack from "@/schemas/commands/CommandsStack.class";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import Project, { DEFAULT_PROJECT_NAME } from "@/schemas/project/Project.class";
import { createRandomId } from "@/schemas/schemas-helpers";
import { createStore } from "zustand";
import { focusFlow } from "../grafcet/flow-management";
import { PageData, ProjectStoreState } from "./project-store-types";

const COMMANDS_STACK_SIZE = 100;

type ProjectStoreSetFunction = (
	partial:
		| ProjectStoreState
		| Partial<ProjectStoreState>
		| ((partial: Partial<ProjectStoreState>) => ProjectStoreState | Partial<ProjectStoreState>),
) => void;

function getInitialPagesData(project: Project | null): Record<string, PageData> {
	const pagesData: Record<string, PageData> = {};
	pagesData[PROJECT_STARTUP_PAGE_ID] = PROJECT_STARTUP_PAGE_DATA;

	return pagesData;
}

export const createProjectStore = () => {
	const commandsStack: CommandsStack<Project> = new CommandsStack(COMMANDS_STACK_SIZE);

	const _openProject = async (set: ProjectStoreSetFunction, project: Project) => {
		const initialPagesData = getInitialPagesData(project);
		set(() => ({
			project: project,
			hasUnsavedChanges: false,
			pagesData: initialPagesData,
			pagesOrder: initialPagesData ? Object.keys(initialPagesData) : [],
			activePageId: initialPagesData ? Object.keys(initialPagesData)[0] : null,
			activeScope: null,
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
			activeScope: null,
		}));
	};

	return createStore<ProjectStoreState>((set, get) => ({
		project: new Project(createRandomId(), DEFAULT_PROJECT_NAME, ""),
		hasUnsavedChanges: false,
		unsavedChangesDialogVisible: false,
		openModalVisible: false,
		onUnsavedChangesDialogCancel: null,
		onUnsavedChangesDialogContinue: null,
		savingProject: false,
		activeScope: null,
		activeScopeType: null,

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
				onUnsavedChangesDialogCancel: null,
				onUnsavedChangesDialogContinue: () => {
					_closeProject(set);
				},
			}));
		},

		setProjectName: (newName: string) => {
			const project = get().project;
			if (!project) return;
			set(() => {
				const newProject = project.copy();
				newProject.name = newName;
				return { project: newProject, hasUnsavedChanges: true };
			});
		},

		setProjectAuthor: (newAuthor: string) => {
			const project = get().project;
			if (!project) return;
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
					onUnsavedChangesDialogCancel: null,
					onUnsavedChangesDialogContinue: () => set(() => ({ openModalVisible: true })),
				}));
			}
		},

		setActiveScope: (scope: string | null) => {
			const previousScope = get().activeScope;
			const pagesData = get().pagesData;
			const scopeType = scope ? pagesData[scope]?.type || "project" : null;
			set(() => ({ activeScope: scope, activeScopeType: scopeType }));
			//If the scope is a grafcet, set the focus on the grafcet flow
			//PRevent the focus change if the scope didn't change, to avoid issues with the grafcet flow shortcuts when the user clicks on the flow while it's already active
			if (scope && previousScope !== scope && scopeType === "grafcet") {
				focusFlow(scope);
			}
		},

		//Grafcets
		_grafcetsFlowsData: {},

		newGrafcet: (name: string, format: GrafcetFormat) => {
			const project = get().project;
			if (!project) return null;
			const newProject = project.copy();
			const grafcet = newProject.addGrafcet(name, format);
			get().openPage({
				id: grafcet.id,
				type: "grafcet",
				title: grafcet.name,
			});
			set(() => ({ project: newProject, hasUnsavedChanges: true }));
			return grafcet;
		},

		updateGrafcetData: (grafcet: Grafcet) => {
			const project = get().project;
			if (!project) return;
			if (!project.grafcets[grafcet.id]) throw new Error("Grafcet not found in project");
			if (!deepObjectsComparison(project.grafcets[grafcet.id], grafcet)) {
				set(() => {
					const newProject = project.copy();
					newProject.updateGrafcet(grafcet.id, grafcet);
					return { project: newProject, hasUnsavedChanges: true };
				});
			}
		},

		deleteGrafcet: (grafcetId: string) => {
			const project = get().project;
			if (!project) return;
			if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
			const newProject = project.copy();
			newProject.deleteGrafcet(grafcetId);
			get().closePage(grafcetId);
			set(() => ({ project: newProject, hasUnsavedChanges: true }));
		},

		renameGrafcet: (grafcetId: string, newName: string) => {
			const project = get().project;
			if (!project) return;
			if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
			const newProject = project.copy();
			newProject.grafcets[grafcetId].name = newName;
			//Update the page title if the grafcet page is open
			const pagesData = get().pagesData;
			if (pagesData[grafcetId]) {
				const newPagesData = structuredClone(pagesData);
				newPagesData[grafcetId].title = newName;
				set(() => ({ pagesData: newPagesData }));
			}
			set(() => ({ project: newProject, hasUnsavedChanges: true }));
		},

		getGrafcet: (grafcetId: string) => {
			const project = get().project;
			if (!project) throw new Error("No project opened");
			if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
			return project.grafcets[grafcetId];
		},

		//Pages
		pagesData: getInitialPagesData(null),
		pagesOrder: [PROJECT_STARTUP_PAGE_ID],
		activePageId: PROJECT_STARTUP_PAGE_ID,
		openPage: (pageData: PageData) => {
			const project = get().project;
			if (!project) return;
			const pagesOrder = get().pagesOrder;
			const pagesData = get().pagesData;
			if (pagesOrder.includes(pageData.id)) {
				set(() => ({ activePageId: pageData.id }));
				return;
			}
			const newPagesOrder = [...pagesOrder];
			newPagesOrder.push(pageData.id);
			const newPagesData = structuredClone(pagesData);
			newPagesData[pageData.id] = pageData;
			set(() => ({ pagesData: newPagesData, pagesOrder: newPagesOrder }));
			get().setActivePage(pageData.id);
		},

		closePage: (pageId: string) => {
			const project = get().project;
			if (!project) return;
			const pagesOrder = get().pagesOrder;
			const pagesData = get().pagesData;
			const activePageId = get().activePageId;
			if (!pagesOrder.includes(pageId)) return;
			const newPagesData = structuredClone(pagesData);
			delete newPagesData[pageId];
			const newPagesOrder = pagesOrder.filter((id) => id !== pageId);
			//If the page was active, activate the previous page if the page is not the first one, otherwise the next one
			let newActivePageId = activePageId;
			if (newPagesOrder.length == 0) newActivePageId = null;
			else if (activePageId === pageId) {
				const indexInOld = pagesOrder.indexOf(pageId);
				if (indexInOld === 0) {
					newActivePageId = newPagesOrder[0];
				} else {
					newActivePageId = newPagesOrder[indexInOld - 1];
				}
			}
			set(() => ({
				pagesOrder: newPagesOrder,
				pagesData: newPagesData,
				activePageId: newActivePageId,
			}));
		},

		setActivePage: (pageId: string) => {
			const pagesOrder = get().pagesOrder;
			if (!pagesOrder.includes(pageId)) throw new Error(`Page "${pageId}" not opened`);
			get().setActiveScope(pageId);
			set(() => ({ activePageId: pageId }));
		},
	}));
};
