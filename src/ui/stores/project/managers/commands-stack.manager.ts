import CommandsStack from "@/schemas/commands/commands-stack.schema";
import AbstractProjectCommand from "@/schemas/project/commands/abstract-project.command";
import Project from "@/schemas/project/project.schema";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

export default class CommandsStackManager {
	private static COMMANDS_STACK_SIZE = 100;
	private commandsStack: CommandsStack<Project>;
	private setStoreState: ProjectStoreSetFunction;
	private getStoreState: ProjectStoreGetFunction;

	constructor(setStoreState: ProjectStoreSetFunction, getStoreState: ProjectStoreGetFunction) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
		this.commandsStack = new CommandsStack<Project>(CommandsStackManager.COMMANDS_STACK_SIZE);
	}

	executeOperation(commands: AbstractProjectCommand<any>[]): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.DESIGN) {
			console.warn("Cannot execute operation in non-design mode");
			return;
		}
		if (!commands || commands.length === 0) return;
		//console.log("Executing project operation with commands: ", commands);
		const newProject = this.commandsStack.execute(commands, project.copy());
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
	}

	undoOperation(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.DESIGN) {
			console.warn("Cannot undo operation in non-design mode");
			return;
		}
		const [newProject, commands] = this.commandsStack.undo(project.copy());
		if (!commands) return;
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
		this.getStoreState().grafcetsManager.syncMountedStoresFromProject();
		this.getStoreState().laddersManager.syncMountedStoresFromProject();
	}

	redoOperation(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.DESIGN) {
			console.warn("Cannot redo operation in non-design mode");
			return;
		}
		const [newProject, commands] = this.commandsStack.redo(project.copy());
		if (!commands) return;
		this.setStoreState(() => ({
			project: newProject,
			hasUnsavedChanges: true,
			hasCommandsToUndo: this.commandsStack.commandsToUndo.length > 0,
			hasCommandsToRedo: this.commandsStack.commandsToRedo.length > 0,
		}));
		this.getStoreState().grafcetsManager.syncMountedStoresFromProject();
		this.getStoreState().laddersManager.syncMountedStoresFromProject();
	}


}
