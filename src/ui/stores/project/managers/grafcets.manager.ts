import { deepObjectsComparison } from "@/lib/object";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Grafcet, { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import {
	GrafcetStoreManagers,
	GrafcetStoreValues,
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

const COMMANDS_STACK_SIZE = 100;

export default class GrafcetsManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	/**
	 * Undo history of each grafcet, kept here rather than in the grafcet store.
	 *
	 * A grafcet store is created when its page is mounted and dropped when it is closed;
	 * holding the history there meant **closing a tab silently destroyed the undo history**.
	 * Keeping it at project level makes it survive the page, which is what a user expects:
	 * reopening a grafcet should not lose what was done before.
	 *
	 * Not part of the reactive state: nothing renders it, only `hasCommandsToUndo/Redo` are
	 * mirrored into the store for the UI.
	 */
	private commandsStacks: Map<string, CommandsStack<Grafcet>> = new Map();

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	/**
	 * Returns the undo history of a grafcet, creating it on first access.
	 */
	getCommandsStack(grafcetId: string): CommandsStack<Grafcet> {
		let stack = this.commandsStacks.get(grafcetId);
		if (!stack) {
			stack = new CommandsStack<Grafcet>(COMMANDS_STACK_SIZE);
			this.commandsStacks.set(grafcetId, stack);
		}
		return stack;
	}

	/**
	 * Drops every undo history. Called when a project is opened or closed: the histories
	 * belong to the project, keeping them across projects would be meaningless.
	 */
	clearCommandsStacks(): void {
		this.commandsStacks.clear();
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
		const existing = project.getGrafcet(grafcet.id);
		if (!existing) throw new Error("Grafcet not found in project");
		if (!deepObjectsComparison(existing, grafcet)) {
			this.setStoreState(() => {
				const newProject = project.copy();
				newProject.updateProgram(grafcet.id, grafcet);
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
		if (!project.getGrafcet(grafcetId)) throw new Error("Grafcet not found in project");
		const newProject = project.copy();
		newProject.deleteProgram(grafcetId);
		this.commandsStacks.delete(grafcetId);
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
		if (!project.getGrafcet(grafcetId)) throw new Error("Grafcet not found in project");
		const newProject = project.copy();
		//getGrafcet rend explicite que l'on modifie l'instance, et non un objet temporaire
		newProject.getGrafcet(grafcetId)!.name = newName;
		//Update the page title if the grafcet page is open
		const pagesData = this.getStoreState().pagesData;
		if (pagesData[grafcetId]) {
			const newPagesData = structuredClone(pagesData);
			newPagesData[grafcetId].title = newName;
			this.setStoreState(() => ({ pagesData: newPagesData }));
		}
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	/**
	 * Makes the mounted grafcet stores adopt the grafcets currently held by the project.
	 *
	 * A project-level command can rewrite a grafcet (renaming a variable rewrites the
	 * expressions referencing it, in every grafcet). The grafcets whose page is closed are
	 * already up to date, since the project holds them directly. But a mounted store owns
	 * its own copy and pushes it back into the project, so without this it would overwrite
	 * the command's result with its stale version.
	 */
	syncMountedStoresFromProject(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const managers = this.getStoreState().grafcetsStoresManagers;
		Object.entries(managers).forEach(([grafcetId, { workflowManager }]) => {
			const grafcet = project.getGrafcet(grafcetId);
			if (!grafcet) return;
			//A copy, so that the store and the project never share the same instance
			workflowManager.adoptGrafcet(grafcet.copy());
		});
	}

	getGrafcet(grafcetId: string): Grafcet {
		const project = this.getStoreState().project;
		if (!project) throw new Error("No project opened");
		const grafcet = project.getGrafcet(grafcetId);
		if (!grafcet) throw new Error("Grafcet not found in project");
		return grafcet;
	}
}
