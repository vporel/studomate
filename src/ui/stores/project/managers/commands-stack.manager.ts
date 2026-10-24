import { deepObjectsComparison } from "@/lib/object";
import { refuseEdit } from "../editability";
import CommandsStack from "@/schemas/commands/commands-stack.schema";
import AbstractProjectCommand from "@/schemas/project/commands/abstract-project.command";
import Project from "@/schemas/project/project.schema";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store";

export default class ProjectCommandsStackManager {
	private static COMMANDS_STACK_SIZE = 100;
	private commandsStack: CommandsStack<Project>;
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(
		setStoreState: ProjectStoreSetFunction,
		getStoreState: ProjectStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.commandsStack = new CommandsStack<Project>(
			ProjectCommandsStackManager.COMMANDS_STACK_SIZE,
		);
	}

	executeOperation(commands: AbstractProjectCommand<any>[]): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (refuseEdit(this.getStoreState(), "execute operation")) return;
		if (!commands || commands.length === 0) return;
		const previous = project;
		const newProject = this.commandsStack.execute(commands, project.copy());
		this.adopt(newProject, previous);
	}

	undoOperation(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (refuseEdit(this.getStoreState(), "undo operation")) return;
		const previous = project;
		const [newProject, commands] = this.commandsStack.undo(project.copy());
		if (!commands) return;
		this.adopt(newProject, previous);
	}

	redoOperation(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		if (refuseEdit(this.getStoreState(), "redo operation")) return;
		const previous = project;
		const [newProject, commands] = this.commandsStack.redo(project.copy());
		if (!commands) return;
		this.adopt(newProject, previous);
	}

	private adopt(newProject: Project, previous: Project): void {
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
		//A project command can rewrite the grafcets/ladders themselves (renaming a variable
		//rewrites the expressions/references to it), so the mounted stores must adopt the result
		this.getStoreState().grafcetsManager.syncMountedStoresFromProject();
		this.getStoreState().laddersManager.syncMountedStoresFromProject();
		this.getStoreState().hmiManager.syncMountedStoresFromProject();
		this.clearCommandsStacksOfRewrittenPrograms(newProject, previous);
		if (
			newProject.scene3d !== previous.scene3d ||
			newProject.name !== previous.name
		) {
			this.getStoreState().scene3dLinkManager.onSceneChanged();
		}
	}

	/**
	 * A renamed variable rewrites the programs referencing it, but their histories hold
	 * snapshots written with the old mnemonic: undoing would reintroduce it. The histories of
	 * the rewritten programs are dropped; the others keep theirs.
	 */
	private clearCommandsStacksOfRewrittenPrograms(
		newProject: Project,
		previous: Project,
	): void {
		if (!this.hasRenamedVariable(newProject, previous)) return;
		const changedIds = <T extends { id: string }>(
			current: T[],
			before: (id: string) => T | undefined,
		) =>
			current
				.filter((item) => {
					const old = before(item.id);
					return !old || !deepObjectsComparison(old, item);
				})
				.map((item) => item.id);
		const state = this.getStoreState();
		state.grafcetsManager.clearCommandsStacksOf(
			changedIds(Object.values(newProject.grafcets), (id) =>
				previous.getGrafcet(id),
			),
		);
		state.laddersManager.clearCommandsStacksOf(
			changedIds(Object.values(newProject.ladders), (id) =>
				previous.getLadder(id),
			),
		);
		state.hmiManager.clearCommandsStacksOf(
			changedIds(Object.values(newProject.hmiPages), (id) =>
				previous.getHmiPage(id),
			),
		);
	}

	private hasRenamedVariable(newProject: Project, previous: Project): boolean {
		return newProject.variables.some((variable) => {
			const old = previous.variables.find((v) => v.id === variable.id);
			return old !== undefined && old.mnemonic !== variable.mnemonic;
		});
	}
}
