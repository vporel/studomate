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

	abstract execute(object: T): T;

	abstract cancel(object: T): T;
}
