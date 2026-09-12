import AbstractCommand from "./abstract.command";

/**
 * Class representing a stack of commands.
 * It defines the structure for executing, undoing, redoing, and clearing commands.
 * @template T - The type of the object the commands operate on.
 */
export default class CommandsStack<T> {
	commandsToUndo: AbstractCommand<T, any>[][];
	commandsToRedo: AbstractCommand<T, any>[][];
	undoLimit: number;

	constructor(undoLimit = 100) {
		this.commandsToUndo = [];
		this.commandsToRedo = [];
		this.undoLimit = undoLimit;
	}

	execute(commands: AbstractCommand<T, any>[], object: T): T {
		const validCommands: AbstractCommand<T, any>[] = [];
		for (const command of commands) {
			const [result, isCommandValid] = command.execute(object);
			if (!isCommandValid) continue;
			validCommands.push(command);
			object = result;
		}
		this.commandsToUndo.push(validCommands);
		this.commandsToRedo = [];
		if (this.commandsToUndo.length > this.undoLimit) {
			this.commandsToUndo.shift();
		}
		return object;
	}

	/**
	 *
	 * @param object
	 * @returns Tuple : The first element is the new object after undoing the command, the second element is the command that was undone. If there is no command to undo, both elements are null.
	 */
	undo(object: T): [T, AbstractCommand<T, any>[] | null] {
		const commands = this.commandsToUndo.pop();
		if (!commands) return [object, null];
		this.commandsToRedo.push(commands);
		//Ordre inverse de l'exécution : si B dépend de A, annuler A avant B produirait un état
		//incohérent.
		for (let i = commands.length - 1; i >= 0; i--) {
			object = commands[i].cancel(object);
		}
		return [object, commands];
	}

	/**
	 *
	 * @param object
	 * @returns Tuple : The first element is the new object after redoing the command, the second element is the command that was redone. If there is no command to redo, both elements are null.
	 */
	redo(object: T): [T, AbstractCommand<T, any>[] | null] {
		const commands = this.commandsToRedo.pop();
		if (!commands) return [object, null];
		for (const command of commands) {
			const [result] = command.execute(object);
			object = result;
		}
		this.commandsToUndo.push(commands);
		return [object, commands];
	}

	clear(): void {
		this.commandsToUndo = [];
		this.commandsToRedo = [];
	}
}
