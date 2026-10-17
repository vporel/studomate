/** The compiled project cannot be expressed in the bytecode: the analysis let something through. */
export default class BytecodeGenerationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BytecodeGenerationError";
	}
}
