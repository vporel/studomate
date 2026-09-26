import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { NumericType } from "../numeric-typing";
import SemanticException from "./semantic.exception";

export default class ConstantOutOfRangeException extends SemanticException {
	private readonly value: number;
	private readonly targetType: NumericType;

	constructor(value: number, targetType: NumericType, originNode: ASTNode) {
		super(
			`Constant ${value} is out of the range of type ${targetType}`,
			originNode,
			[originNode],
		);
		this.value = value;
		this.targetType = targetType;
	}

	getValue(): number {
		return this.value;
	}

	getTargetType(): NumericType {
		return this.targetType;
	}
}
