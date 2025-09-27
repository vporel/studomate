import AbstractCommand from "./AbstractCommand.class";

/**
 * Class representing a stack of commands.
 * It defines the structure for executing, undoing, redoing, and clearing commands.
 * @template T - The type of the object the commands operate on.
 */
export default class CommandsStack<T> {
	commandsToUndo: AbstractCommand<T, any>[];
	commandsToRedo: AbstractCommand<T, any>[];
	undoLimit: number;

	constructor(undoLimit = 100) {
		this.commandsToUndo = [];
		this.commandsToRedo = [];
		this.undoLimit = undoLimit;
	}

	execute(command: AbstractCommand<T, any>, object: T): T {
		const newObject = command.execute(object);
		this.commandsToUndo.push(command);
		this.commandsToRedo = [];
		if (this.commandsToUndo.length > this.undoLimit) {
			this.commandsToUndo.shift();
		}
		return newObject;
	}

	/**
	 *
	 * @param object
	 * @returns Tuple : The first element is the new object after undoing the command, the second element is the command that was undone. If there is no command to undo, both elements are null.
	 */
	undo(object: T): [T | null, AbstractCommand<T, any> | null] {
		if (this.commandsToUndo.length === 0) return [null, null];
		const command = this.commandsToUndo.pop();
		if (!command) return [null, null];
		this.commandsToRedo.push(command);
		return [command.cancel(object), command];
	}

	/**
	 *
	 * @param object
	 * @returns Tuple : The first element is the new object after redoing the command, the second element is the command that was redone. If there is no command to redo, both elements are null.
	 */
	redo(object: T): [T | null, AbstractCommand<T, any> | null] {
		if (this.commandsToRedo.length === 0) return [null, null];
		const command = this.commandsToRedo.pop();
		if (!command) return [null, null];
		this.commandsToUndo.push(command);
		return [command.execute(object), command];
	}

	clear(): void {
		this.commandsToUndo = [];
		this.commandsToRedo = [];
	}
}
