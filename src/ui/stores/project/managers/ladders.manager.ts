import { deepObjectsComparison } from "@/lib/object";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { LadderStoreManagers, LadderStoreValues, ProjectStoreGetFunction, ProjectStoreSetFunction } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

const COMMANDS_STACK_SIZE = 100;

export default class LaddersManager {
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	private commandsStacks: Map<string, CommandsStack<Ladder>> = new Map();

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	getCommandsStack(ladderId: string): CommandsStack<Ladder> {
		let stack = this.commandsStacks.get(ladderId);
		if (!stack) {
			stack = new CommandsStack<Ladder>(COMMANDS_STACK_SIZE);
			this.commandsStacks.set(ladderId, stack);
		}
		return stack;
	}

	clearCommandsStacks(): void {
		this.commandsStacks.clear();
	}

	getActiveLadderStoreValues(): LadderStoreValues | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== "ladder" || !activeScope) return null;
		return this.getStoreState().laddersStoresValues[activeScope] || null;
	}

	setLadderStoreValues(ladderId: string, values: LadderStoreValues): void {
		this.setStoreState((state) => {
			const newLaddersStoresValues = { ...state.laddersStoresValues };
			newLaddersStoresValues[ladderId] = {
				...newLaddersStoresValues[ladderId],
				...values,
			};
			return { laddersStoresValues: newLaddersStoresValues };
		});
	}

	registerLadderStoreManager(ladderId: string, manager: LadderStoreManagers): void {
		this.setStoreState((state) => {
			const newLaddersStoresManagers = { ...state.laddersStoresManagers };
			newLaddersStoresManagers[ladderId] = manager;
			return { laddersStoresManagers: newLaddersStoresManagers };
		});
	}

	deleteLadderStoreManager(ladderId: string): void {
		this.setStoreState((state) => {
			const newLaddersStoresManagers = { ...state.laddersStoresManagers };
			delete newLaddersStoresManagers[ladderId];
			return { laddersStoresManagers: newLaddersStoresManagers };
		});
	}

	getActiveLadderStoreManagers(): LadderStoreManagers | null {
		const activeScope = this.getStoreState().activeScope;
		const activeScopeType = this.getStoreState().activeScopeType;
		if (activeScopeType !== "ladder" || !activeScope) return null;
		return this.getStoreState().laddersStoresManagers[activeScope] || null;
	}

	newLadder(name: string): Ladder | null {
		const project = this.getStoreState().project;
		if (!project) return null;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot create ladder in non-design mode");
			return null;
		}
		const newProject = project.copy();
		const ladder = newProject.createLadder(name);
		this.getStoreState().pagesManager.openPage({
			id: ladder.id,
			type: "ladder",
			title: ladder.name,
		});
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
		return ladder;
	}

	updateLadderData(ladder: Ladder): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot update ladder in non-design mode");
			return;
		}
		const existing = project.getLadder(ladder.id);
		if (!existing) throw new Error("Ladder not found in project");
		if (!deepObjectsComparison(existing, ladder)) {
			this.setStoreState(() => {
				const newProject = project.copy();
				newProject.updateProgram(ladder.id, ladder);
				return { project: newProject, hasUnsavedChanges: true };
			});
		}
	}

	deleteLadder(ladderId: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot delete ladder in non-design mode");
			return;
		}
		if (!project.getLadder(ladderId)) throw new Error("Ladder not found in project");
		const newProject = project.copy();
		newProject.deleteProgram(ladderId);
		this.commandsStacks.delete(ladderId);
		this.getStoreState().pagesManager.closePage(ladderId);
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	renameLadder(ladderId: string, newName: string): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (this.getStoreState().mode !== ProjectMode.DESIGN) {
			console.warn("Cannot rename ladder in non-design mode");
			return;
		}
		if (!project.getLadder(ladderId)) throw new Error("Ladder not found in project");
		const newProject = project.copy();
		newProject.getLadder(ladderId)!.name = newName;
		const pagesData = this.getStoreState().pagesData;
		if (pagesData[ladderId]) {
			const newPagesData = structuredClone(pagesData);
			newPagesData[ladderId].title = newName;
			this.setStoreState(() => ({ pagesData: newPagesData }));
		}
		this.setStoreState(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	getLadder(ladderId: string): Ladder {
		const project = this.getStoreState().project;
		if (!project) throw new Error("No project opened");
		const ladder = project.getLadder(ladderId);
		if (!ladder) throw new Error("Ladder not found in project");
		return ladder;
	}
}
