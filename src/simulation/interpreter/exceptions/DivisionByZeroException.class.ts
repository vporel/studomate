import InterpreterException from "./InterpreterException.class";

export class DivisionByZeroException extends InterpreterException {
	private readonly left: number;
	private readonly right: number;

	constructor(left: number, right: number) {
		super(`Division by zero: ${left} / ${right}`);
		this.left = left;
		this.right = right;
	}

	public getLeft(): number {
		return this.left;
	}

	public getRight(): number {
		return this.right;
	}
}
