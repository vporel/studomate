import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { NumericType } from "../numeric-typing";
import SemanticException from "./semantic.exception";

/** Numeric operands of timer (PT, ET) and counter (PV, CV) blocks. */
export type BlockNumericOperand = "PT" | "ET" | "PV" | "CV";

export default class BitStringBlockOperandException extends SemanticException {
	private readonly operand: BlockNumericOperand;
	private readonly operandType: NumericType;

	constructor(
		operand: BlockNumericOperand,
		operandType: NumericType,
		originNode: TimerNode | CounterNode,
		operandNode: ASTNode,
	) {
		super(
			`The ${operand} operand of a block cannot be of the bit string type ${operandType}`,
			originNode,
			[operandNode],
		);
		this.operand = operand;
		this.operandType = operandType;
	}

	getOperand(): BlockNumericOperand {
		return this.operand;
	}

	getOperandType(): NumericType {
		return this.operandType;
	}
}
