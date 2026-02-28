import { deepObjectsComparison } from "@/lib/object";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import {
	GrafcetStoreManagers,
	GrafcetStoreValues,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

export default class GrafcetsManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	getActiveGrafcetStoreValues(): GrafcetStoreValues | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== "grafcet" || !activeScope) return null;
		return this.getStoreState().grafcetsStoresValues[activeScope] || null;
	}

	setGrafcetStoreValues(grafcetId: string, values: GrafcetStoreValues): void {
		this.setStoreState((state) => {
			const newGrafcetsStoresValues = { ...state.grafcetsStoresValues };
			newGrafcetsStoresValues[grafcetId] = {
				...newGrafcetsStoresValues[grafcetId],
				...values,
			};
			return { grafcetsStoresValues: newGrafcetsStoresValues };
		});
	}

	/**
	 * This method should be called once in the grafcet context
	 * @param grafcetId
	 * @param manager
	 */
	registerGrafcetStoreManager(grafcetId: string, manager: GrafcetStoreManagers): void {
		this.setStoreState((state) => {
			const newGrafcetsStoresManagers = { ...state.grafcetsStoresManagers };
			newGrafcetsStoresManagers[grafcetId] = manager;
			return { grafcetsStoresManagers: newGrafcetsStoresManagers };
		});
	}

	deleteGrafcetStoreManager(grafcetId: string): void {
		this.setStoreState((state) => {
			const newGrafcetsStoresManagers = { ...state.grafcetsStoresManagers };
			delete newGrafcetsStoresManagers[grafcetId];
			return { grafcetsStoresManagers: newGrafcetsStoresManagers };
		});
	}

	getActiveGrafcetStoreManagers(): GrafcetStoreManagers | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== "grafcet" || !activeScope) return null;
		return this.getStoreState().grafcetsStoresManagers[activeScope] || null;
	}

	newGrafcet(name: string, format: GrafcetFormat): Grafcet | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot create grafcet in non-design mode");
			return null;
		}
		const newProject = project.copy();
		const grafcet = newProject.createGrafcet(name, format);
		this.getStoreState().pagesManager.openPage({
			id: grafcet.id,
			type: "grafcet",
			title: grafcet.name,
		});
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
		return grafcet;
	}

	updateGrafcetData(grafcet: Grafcet): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot update grafcet in non-design mode");
			return;
		}
		if (!project.grafcets[grafcet.id]) throw new Error("Grafcet not found in project");
		if (!deepObjectsComparison(project.grafcets[grafcet.id], grafcet)) {
			this.setStoreState(() => {
				const newProject = project.copy();
				newProject.updateGrafcet(grafcet.id, grafcet);
				return { project: newProject, hasUnsavedChanges: true };
			});
		}
	}

	deleteGrafcet(grafcetId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot delete grafcet in non-design mode");
			return;
		}
		if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
		const newProject = project.copy();
		newProject.deleteGrafcet(grafcetId);
		this.getStoreState().pagesManager.closePage(grafcetId);
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	renameGrafcet(grafcetId: string, newName: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot rename grafcet in non-design mode");
			return;
		}
		if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
		const newProject = project.copy();
		newProject.grafcets[grafcetId].name = newName;
		//Update the page title if the grafcet page is open
		const pagesData = this.getStoreState().pagesData;
		if (pagesData[grafcetId]) {
			const newPagesData = structuredClone(pagesData);
			newPagesData[grafcetId].title = newName;
			this.setStoreState(() => ({ pagesData: newPagesData }));
		}
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	getGrafcet(grafcetId: string): Grafcet {
		const project = this.getStoreState().project;
		if (!project) throw new Error("No project opened");
		if (!project.grafcets[grafcetId]) throw new Error("Grafcet not found in project");
		return project.grafcets[grafcetId];
	}
}
