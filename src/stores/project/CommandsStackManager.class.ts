import CommandsStack from "@/schemas/commands/CommandsStack.class";
import AbstractProjectCommand from "@/schemas/project/commands/AbstractProjectCommand.class";
import Project from "@/schemas/project/Project.class";
import { ProjectStoreGetFunction, ProjectStoreSetFunction } from "./project-store-types";

export default class CommandsStackManager {
	private static COMMANDS_STACK_SIZE = 100;
	private commandsStack: CommandsStack<Project>;
	private setProjectStore: ProjectStoreSetFunction;
	private getProjectStore: ProjectStoreGetFunction;

	hasCommandsToUndo: boolean = false;
	hasCommandsToRedo: boolean = false;

	constructor(set: ProjectStoreSetFunction, get: ProjectStoreGetFunction) {
		this.setProjectStore = set;
		this.getProjectStore = get;
		this.commandsStack = new CommandsStack<Project>(CommandsStackManager.COMMANDS_STACK_SIZE);
	}

	executeOperation(commands: AbstractProjectCommand<any>[]): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		if (!commands || commands.length === 0) return;
		console.log("Executing project operation with commands: ", commands);
		const newProject = this.commandsStack.execute(commands, project.copy());
		this.setProjectStore(() => ({ project: newProject, hasUnsavedChanges: true }));
	}

	undoOperation(): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const [newGrafcet, commands] = this.commandsStack.undo(project.copy());
		if (!commands) return;
		this.setProjectStore(() => ({ grafcet: newGrafcet, hasUnsavedChanges: true }));
		commands?.forEach((command) => this.commandUndo(command));
	}

	redoOperation(): void {
		const project = this.getProjectStore().project;
		if (!project) return;
		const [newGrafcet, commands] = this.commandsStack.redo(project.copy());
		if (!commands) return;
		this.setProjectStore(() => ({ grafcet: newGrafcet, hasUnsavedChanges: true }));
		commands?.forEach((command) => this.commandRedo(command));
	}

	private commandUndo(command: AbstractProjectCommand<any>): void {}

	private commandRedo(command: AbstractProjectCommand<any>): void {}
}
