import {
	ArithmeticExpressionNode,
	UnaryExpressionNode,
} from "@/expression-language/ast/nodes/expressions";
import { NumericType } from "../numeric-typing";
import SemanticException from "./semantic.exception";

export default class BitStringArithmeticException extends SemanticException {
	private readonly operator: string;
	private readonly operandType: NumericType;

	constructor(
		operator: string,
		operandType: NumericType,
		originNode: ArithmeticExpressionNode | UnaryExpressionNode,
	) {
		super(
			`Operator '${operator}' is not allowed on the bit string type ${operandType}`,
			originNode,
			[originNode],
		);
		this.operator = operator;
		this.operandType = operandType;
	}

	getOperator(): string {
		return this.operator;
	}

	getOperandType(): NumericType {
		return this.operandType;
	}
}
