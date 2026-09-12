import { ASTNode } from "../nodes/ast-node";
import {
	CounterNode,
	TimerNode,
	TimerStringDeclarationNode,
} from "../nodes/blocks";
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
			case "TIMER_BLOCK":
				return this.visitTimerBlockNode(node);
			case "TIMER_STRING_DECLARATION":
				return this.visitTimerStringDeclarationNode(node);
			case "COUNTER_BLOCK":
				return this.visitCounterBlockNode(node);
		}
	}

	// Identifier
	protected abstract visitIdentifierNode(node: IdentifierNode): T;

	// Literals
	protected abstract visitBooleanNode(node: BooleanNode): T;
	protected abstract visitNumberNode(node: NumberNode): T;
	protected abstract visitStringNode(node: StringNode): T;

	// Expressions
	protected abstract visitUnaryExpressionNode(node: UnaryExpressionNode): T;
	protected abstract visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): T;
	protected abstract visitComparisonExpressionNode(
		node: ComparisonExpressionNode,
	): T;
	protected abstract visitLogicalExpressionNode(node: LogicalExpressionNode): T;

	// Statements
	protected abstract visitAssignStatementNode(node: AssignStatementNode): T;

	// Controls
	protected abstract visitIfControlNode(node: IfControlNode): T;

	//Blocks
	protected abstract visitTimerBlockNode(node: TimerNode): T;
	protected abstract visitTimerStringDeclarationNode(
		node: TimerStringDeclarationNode,
	): T;
	protected abstract visitCounterBlockNode(node: CounterNode): T;
}
