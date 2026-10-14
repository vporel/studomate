import CommandsStack from "@/schemas/commands/commands-stack.schema";
import AbstractProjectCommand from "@/schemas/project/commands/abstract-project.command";
import Project from "@/schemas/project/project.schema";
import {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "../project.store";
import { ProjectMode } from "../ProjectMode.enum";

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
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.DESIGN) {
			console.warn("Cannot execute operation in non-design mode");
			return;
		}
		if (!commands || commands.length === 0) return;
		const previousScene = project.scene3d;
		const newProject = this.commandsStack.execute(commands, project.copy());
		this.adopt(newProject, previousScene);
	}

	undoOperation(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.DESIGN) {
			console.warn("Cannot undo operation in non-design mode");
			return;
		}
		const previousScene = project.scene3d;
		const [newProject, commands] = this.commandsStack.undo(project.copy());
		if (!commands) return;
		this.adopt(newProject, previousScene);
	}

	redoOperation(): void {
		const project = this.getStoreState().project;
		if (!project) return;
		const mode = this.getStoreState().mode;
		if (mode !== ProjectMode.DESIGN) {
			console.warn("Cannot redo operation in non-design mode");
			return;
		}
		const previousScene = project.scene3d;
		const [newProject, commands] = this.commandsStack.redo(project.copy());
		if (!commands) return;
		this.adopt(newProject, previousScene);
	}

	private adopt(newProject: Project, previousScene: Project["scene3d"]): void {
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
		if (newProject.scene3d !== previousScene) {
			this.getStoreState().scene3dLinkManager.onSceneChanged();
		}
	}
}
