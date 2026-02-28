import { TimerNode } from "../ast/nodes/blocks";
import { IfControlNode } from "../ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../ast/nodes/expressions";
import { IdentifierNode } from "../ast/nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../ast/nodes/literals";
import { AssignStatementNode } from "../ast/nodes/statements";
import { BaseVisitor } from "../ast/visitors/base.visitor";
import { Environment } from "../environment/environment";

/**
 * void for control nodes
 */
export type ExpectedNodeResultType = "number" | "boolean" | "string" | "void";

export default class TypeAnalyserVisitor extends BaseVisitor<ExpectedNodeResultType> {
	private env: Environment;

	constructor(environment: Environment) {
		super();
		this.env = environment;
	}

	protected visitIdentifierNode(node: IdentifierNode): ExpectedNodeResultType {
		return this.env.getVariableTypeByName(node.value);
	}

	protected visitBooleanNode(node: BooleanNode): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitNumberNode(node: NumberNode): ExpectedNodeResultType {
		return "number";
	}

	protected visitStringNode(node: StringNode): ExpectedNodeResultType {
		return "string";
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): ExpectedNodeResultType {
		return "number";
	}

	protected visitComparisonExpressionNode(node: ComparisonExpressionNode): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): ExpectedNodeResultType {
		return "boolean";
	}

	protected visitAssignStatementNode(node: AssignStatementNode): ExpectedNodeResultType {
		return this.visit(node.right);
	}

	protected visitIfControlNode(node: IfControlNode): ExpectedNodeResultType {
		return "void";
	}

	protected visitTimerBlockNode(node: TimerNode): ExpectedNodeResultType {
		return "boolean";
	}
}
