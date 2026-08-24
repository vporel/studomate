import { ASTNode } from "../nodes/ast-node";
import { CounterNode, TimerNode, TimerStringDeclarationNode } from "../nodes/blocks";
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
import { BaseVisitor } from "./base.visitor";

/**
 * This visitor is used to find all the nodes of a specified type in an AST
 */
export default class FinderVisitor<T extends ASTNode = ASTNode> extends BaseVisitor<T[]> {
	private typeToFind: ASTNode["type"];

	constructor(typeToFind: ASTNode["type"]) {
		super();
		this.typeToFind = typeToFind;
	}

	protected visitIdentifierNode(node: IdentifierNode): T[] {
		return node.type === this.typeToFind ? [node as T] : [];
	}

	protected visitBooleanNode(node: BooleanNode): T[] {
		return node.type === this.typeToFind ? [node as T] : [];
	}

	protected visitNumberNode(node: NumberNode): T[] {
		return node.type === this.typeToFind ? [node as T] : [];
	}

	protected visitStringNode(node: StringNode): T[] {
		return node.type === this.typeToFind ? [node as T] : [];
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): T[] {
		return this.visit(node.expr).concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): T[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitComparisonExpressionNode(node: ComparisonExpressionNode): T[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): T[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitAssignStatementNode(node: AssignStatementNode): T[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitIfControlNode(node: IfControlNode): T[] {
		return this.visit(node.condition)
			.concat(node.trueBranch.flatMap((n) => this.visit(n)))
			.concat(node.falseBranch ? node.falseBranch.flatMap((n) => this.visit(n)) : [])
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitTimerBlockNode(node: TimerNode): T[] {
		return this.visit(node.input)
			.concat(this.visit(node.lastInput))
			.concat(this.visit(node.presetTime))
			.concat(this.visit(node.elapsedTime))
			.concat(this.visit(node.output))
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitTimerStringDeclarationNode(node: TimerStringDeclarationNode): T[] {
		return this.visit(node.input).concat(node.type === this.typeToFind ? [node as T] : []);
	}

	protected visitCounterBlockNode(node: CounterNode): T[] {
		return this.visit(node.input)
			.concat(this.visit(node.control))
			.concat(this.visit(node.presetValue))
			.concat(this.visit(node.currentValue))
			.concat(this.visit(node.output))
			.concat(node.type === this.typeToFind ? [node as T] : []);
	}
}
