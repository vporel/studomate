/**
 * Abstract class representing a command with payload.
 * It defines the structure for executing and undoing commands on a given object.
 * @template T - The type of the object the command operates on.
 * @template P - The type of the payload the command operates on.
 */
export default abstract class AbstractCommand<T, P> {
	payload: P;

	constructor(payload: P) {
		this.payload = payload;
	}

	abstract getType(): string;

	/**
	 * @param object
	 * @return Tuple : The first element is the new object after executing the command, the second element indicates if the command was valid and executed.
	 * An invalid command does not modify the object and is not added to the undo stack.
	 */
	abstract execute(object: T): [object: T, isCommandValid: boolean];

	abstract cancel(object: T): T;
}
