export default abstract class ParserException extends Error {
	private readonly position: number;

	constructor(message: string, position: number) {
		super(message);
		this.position = position;
	}

	getPosition(): number {
		return this.position;
	}
}
