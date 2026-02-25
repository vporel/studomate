import { ASTNode } from "../nodes/ast-node";
import { IfControlNode } from "../nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../nodes/expressions";
import { IdentifierNode } from "../nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../nodes/literals";
import { AssignStatementNode } from "../nodes/statements";

export abstract class BaseVisitor<T> {
	visit(node: ASTNode): T {
		switch (node.type) {
			case "IDENTIFIER":
				return this.visitIdentifierNode(node);
			case "BOOLEAN_LITERAL":
				return this.visitBooleanNode(node);
			case "NUMBER_LITERAL":
				return this.visitNumberNode(node);
			case "STRING_LITERAL":
				return this.visitStringNode(node);
			case "UNARY_EXPRESSION":
				return this.visitUnaryExpressionNode(node);
			case "ARITHMETIC_EXPRESSION":
				return this.visitArithmeticExpressionNode(node);
			case "COMPARISON_EXPRESSION":
				return this.visitComparisonExpressionNode(node);
			case "LOGICAL_EXPRESSION":
				return this.visitLogicalExpressionNode(node);
			case "ASSIGN_STATEMENT":
				return this.visitAssignStatementNode(node);
			case "IF_CONTROL":
				return this.visitIfControlNode(node);
		}
	}

	protected abstract visitIdentifierNode(node: IdentifierNode): T;
	protected abstract visitBooleanNode(node: BooleanNode): T;
	protected abstract visitNumberNode(node: NumberNode): T;
	protected abstract visitStringNode(node: StringNode): T;
	protected abstract visitUnaryExpressionNode(node: UnaryExpressionNode): T;
	protected abstract visitArithmeticExpressionNode(node: ArithmeticExpressionNode): T;
	protected abstract visitComparisonExpressionNode(node: ComparisonExpressionNode): T;
	protected abstract visitLogicalExpressionNode(node: LogicalExpressionNode): T;
	protected abstract visitAssignStatementNode(node: AssignStatementNode): T;
	protected abstract visitIfControlNode(node: IfControlNode): T;
}
