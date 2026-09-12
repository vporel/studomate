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
import { BaseVisitor } from "./base.visitor";

export type ReplacerVisitorReplacement = {
	predicate: (node: ASTNode) => boolean;
	replacement: ASTNode;
};

/**
 * This visitor is used to replace nodes in an AST. It takes a list of predicates and their corresponding replacements,
 * and replaces any node that matches a predicate with the corresponding replacement.
 *
 * When a node is replaced, its children are not visited (they are lost)
 * This means that if you want to replace a node and also visit its children,
 * you need to include the children in the replacement node.
 */
export default class ReplacerVisitor extends BaseVisitor<ASTNode> {
	private replacements: ReplacerVisitorReplacement[];

	constructor(replacements: ReplacerVisitorReplacement[]) {
		super();
		this.replacements = replacements;
	}

	protected visitIdentifierNode(node: IdentifierNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		return replacement ? replacement.replacement : node;
	}

	protected visitBooleanNode(node: BooleanNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		return replacement ? replacement.replacement : node;
	}

	protected visitNumberNode(node: NumberNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		return replacement ? replacement.replacement : node;
	}

	protected visitStringNode(node: StringNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		return replacement ? replacement.replacement : node;
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			expr: this.visit(node.expr),
		};
	}

	protected visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			left: this.visit(node.left),
			right: this.visit(node.right),
		};
	}

	protected visitComparisonExpressionNode(
		node: ComparisonExpressionNode,
	): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			left: this.visit(node.left),
			right: this.visit(node.right),
		};
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			left: this.visit(node.left),
			right: this.visit(node.right),
		};
	}

	protected visitAssignStatementNode(node: AssignStatementNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			left: this.visit(node.left),
			right: this.visit(node.right),
		};
	}

	protected visitIfControlNode(node: IfControlNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			condition: this.visit(node.condition),
			trueBranch: node.trueBranch.map((n) => this.visit(n)),
			falseBranch: node.falseBranch
				? node.falseBranch.map((n) => this.visit(n))
				: null,
		};
	}

	protected visitTimerBlockNode(node: TimerNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			input: this.visit(node.input),
			lastInput: this.visit(node.lastInput),
			presetTime: this.visit(node.presetTime),
			elapsedTime: this.visit(node.elapsedTime),
			output: this.visit(node.output),
		};
	}

	protected visitTimerStringDeclarationNode(
		node: TimerStringDeclarationNode,
	): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			input: this.visit(node.input),
		};
	}

	protected visitCounterBlockNode(node: CounterNode): ASTNode {
		const replacement = this.replacements.find((r) => r.predicate(node));
		if (replacement) return replacement.replacement;
		return {
			...node,
			input: this.visit(node.input),
			control: this.visit(node.control),
			presetValue: this.visit(node.presetValue),
			currentValue: this.visit(node.currentValue),
			output: this.visit(node.output),
		};
	}
}
