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
	ConversionExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../nodes/expressions";
import { IdentifierNode } from "../nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../nodes/literals";
import { AssignStatementNode } from "../nodes/statements";
import { BaseVisitor } from "./base.visitor";

/**
 * Walks a whole tree and collects the nodes accepted by `matches`. Children are collected
 * before their parent, in the order of the node's fields.
 */
export default abstract class AbstractCollectorVisitor<
	T extends ASTNode = ASTNode,
> extends BaseVisitor<T[]> {
	protected abstract matches(node: ASTNode): boolean;

	private collect(node: ASTNode, children: ASTNode[]): T[] {
		const result = children.flatMap((child) => this.visit(child));
		if (this.matches(node)) result.push(node as T);
		return result;
	}

	protected visitIdentifierNode(node: IdentifierNode): T[] {
		return this.collect(node, []);
	}

	protected visitBooleanNode(node: BooleanNode): T[] {
		return this.collect(node, []);
	}

	protected visitNumberNode(node: NumberNode): T[] {
		return this.collect(node, []);
	}

	protected visitStringNode(node: StringNode): T[] {
		return this.collect(node, []);
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): T[] {
		return this.collect(node, [node.expr]);
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): T[] {
		return this.collect(node, [node.left, node.right]);
	}

	protected visitComparisonExpressionNode(node: ComparisonExpressionNode): T[] {
		return this.collect(node, [node.left, node.right]);
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): T[] {
		return this.collect(node, [node.left, node.right]);
	}

	protected visitConversionExpressionNode(node: ConversionExpressionNode): T[] {
		return this.collect(node, [node.expr]);
	}

	protected visitAssignStatementNode(node: AssignStatementNode): T[] {
		return this.collect(node, [node.left, node.right]);
	}

	protected visitIfControlNode(node: IfControlNode): T[] {
		return this.collect(node, [
			node.condition,
			...node.trueBranch,
			...(node.falseBranch ?? []),
		]);
	}

	protected visitTimerBlockNode(node: TimerNode): T[] {
		return this.collect(node, [
			node.input,
			node.lastInput,
			node.presetTime,
			node.elapsedTime,
			node.output,
		]);
	}

	protected visitTimerStringDeclarationNode(
		node: TimerStringDeclarationNode,
	): T[] {
		return this.collect(node, [node.input]);
	}

	protected visitCounterBlockNode(node: CounterNode): T[] {
		return this.collect(node, [
			node.input,
			node.lastInput,
			node.control,
			node.presetValue,
			node.currentValue,
			node.output,
			...(node.down
				? [
						node.down.input,
						node.down.lastInput,
						node.down.load,
						node.down.output,
					]
				: []),
		]);
	}
}
