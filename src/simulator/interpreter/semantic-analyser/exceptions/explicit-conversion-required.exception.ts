import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import { NumericType } from "../numeric-typing";
import SemanticException from "./semantic.exception";

export default class ExplicitConversionRequiredException extends SemanticException {
	private readonly valueType: NumericType;
	private readonly targetType: NumericType;

	constructor(
		valueType: NumericType,
		targetType: NumericType,
		originNode: AssignStatementNode,
	) {
		super(
			`Assigning a ${valueType} value to a ${targetType} variable requires an explicit conversion`,
			originNode,
			[originNode.right],
		);
		this.valueType = valueType;
		this.targetType = targetType;
	}

	getValueType(): NumericType {
		return this.valueType;
	}

	getTargetType(): NumericType {
		return this.targetType;
	}
}
