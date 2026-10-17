import { ConversionExpressionNode } from "@/expression-language/ast/nodes/expressions";
import { NumericType } from "../numeric-typing";
import SemanticException from "./semantic.exception";

/** `expectedType` is `null` when the conversion takes its operand's type (Ladder conversion
 * block) and that type cannot be converted to the target. */
export default class InvalidConversionArgumentException extends SemanticException {
	private readonly targetType: string;
	private readonly expectedType: NumericType | null;
	private readonly actualType: NumericType | "boolean" | "string" | "unknown";

	constructor(
		targetType: string,
		expectedType: NumericType | null,
		actualType: NumericType | "boolean" | "string" | "unknown",
		originNode: ConversionExpressionNode,
	) {
		super(
			`Cannot convert a ${actualType} value to ${targetType}${expectedType ? ` (expected ${expectedType})` : ""}`,
			originNode,
			[originNode.expr],
		);
		this.targetType = targetType;
		this.expectedType = expectedType;
		this.actualType = actualType;
	}

	getTargetType(): string {
		return this.targetType;
	}

	getExpectedType(): NumericType | null {
		return this.expectedType;
	}

	getActualType(): NumericType | "boolean" | "string" | "unknown" {
		return this.actualType;
	}
}
