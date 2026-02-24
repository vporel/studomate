export default abstract class LexerException extends Error {
	private readonly position: number;

	constructor(message: string, position: number) {
		super(message);
		this.position = position;
	}

	public getPosition(): number {
		return this.position;
	}
}
