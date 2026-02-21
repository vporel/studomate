import { deepObjectsComparison } from "@/lib/object";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/Grafcet.class";
import {
	GrafcetStoreActions,
	GrafcetStoreValues,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "./project-store-types";

export default class GrafcetsManager {
	private setProjectStore: ProjectStoreSetFunction;
	private getProjectStore: ProjectStoreGetFunction;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setProjectStore = set;
		this.getProjectStore = get;
	}

	getActiveGrafcetStoreValues(): GrafcetStoreValues | null {
		const activeScope = this.getProjectStore().activeScope;
		const activeScopeType = this.getProjectStore().activeScopeType;
		if (activeScopeType !== "grafcet" || !activeScope) return null;
		return this.getProjectStore().grafcetsStoresValues[activeScope] || null;
	}

	setGrafcetStoreValues(grafcetId: string, values: GrafcetStoreValues): void {
		this.setProjectStore((state) => {
			const newGrafcetsStoresValues = { ...state.grafcetsStoresValues };
			newGrafcetsStoresValues[grafcetId] = {
				...newGrafcetsStoresValues[grafcetId],
				...values,
			};
			return { grafcetsStoresValues: newGrafcetsStoresValues };
		});
	}

	registerGrafcetStoreActions(grafcetId: string, actions: GrafcetStoreActions): void {
		this.setProjectStore((state) => {
			const newGrafcetsStoresActions = { ...state.grafcetsStoresActions };
			newGrafcetsStoresActions[grafcetId] = actions;
			return { grafcetsStoresActions: newGrafcetsStoresActions };
		});
	}

	getActiveGrafcetStoreActions(): GrafcetStoreActions | null {
		const activeScope = this.getProjectStore().activeScope;
		const activeScopeType = this.getProjectStore().activeScopeType;
		if (activeScopeType !== "grafcet" || !activeScope) return null;
		return this.getProjectStore().grafcetsStoresActions[activeScope] || null;
	}

	deleteGrafcetStoreActions(grafcetId: string): void {
		this.setProjectStore((state) => {
			const newGrafcetsStoresActions = { ...state.grafcetsStoresActions };
			delete newGrafcetsStoresActions[grafcetId];
			return { grafcetsStoresActions: newGrafcetsStoresActions };
		});
	}

	newGrafcet(name: string, format: GrafcetFormat): Grafcet | null {
		const project = this.getProjectStore().project;
		if (!project) return null;
		const newProject = project.copy();
		const grafcet = newProject.addGrafcet(name, format);
		this.getProjectStore().pagesManager.openPage({
			id: grafcet.id,
			type: "grafcet",
			title: grafcet.name,
		});
		this.setProjectStore(() => ({ project: newProject, hasUnsavedChanges: true }));
		return grafcet;
	}

	updateGrafcetData(grafcet: Grafcet): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		if (!project.grafcets[grafcet.id]) throw new Error("Grafcet not found in project");
		if (!deepObjectsComparison(project.grafcets[grafcet.id], grafcet)) {
			this.setProjectStore(() => {
				const newProject = project.copy();
				newProject.updateGrafcet(grafcet.id, grafcet);
				return { project: newProject, hasUnsavedChanges: true };
			});
		}
	}

	deleteGrafcet(grafcetId: string): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
		const newProject = project.copy();
		newProject.deleteGrafcet(grafcetId);
		this.getProjectStore().pagesManager.closePage(grafcetId);
		this.setProjectStore(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	renameGrafcet(grafcetId: string, newName: string): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
		const newProject = project.copy();
		newProject.grafcets[grafcetId].name = newName;
		//Update the page title if the grafcet page is open
		const pagesData = this.getProjectStore().pagesData;
		if (pagesData[grafcetId]) {
			const newPagesData = structuredClone(pagesData);
			newPagesData[grafcetId].title = newName;
			this.setProjectStore(() => ({ pagesData: newPagesData }));
		}
		this.setProjectStore(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	getGrafcet(grafcetId: string): Grafcet {
		const project = this.getProjectStore().project;
		if (!project) throw new Error("No project opened");
		if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
		return project.grafcets[grafcetId];
	}
}
