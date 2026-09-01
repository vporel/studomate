import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import {
	CounterNode,
	TimerNode,
	TimerStringDeclarationNode,
} from "@/expression-language/ast/nodes/blocks";
import { IfControlNode } from "@/expression-language/ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "@/expression-language/ast/nodes/expressions";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import {
	BooleanNode,
	NumberNode,
	StringNode,
} from "@/expression-language/ast/nodes/literals";
import { AssignStatementNode } from "@/expression-language/ast/nodes/statements";
import { BaseVisitor } from "@/expression-language/ast/visitors/base.visitor";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";

export default class SimplifierVisitor extends BaseVisitor<ASTNode> {
	protected visitIdentifierNode(node: IdentifierNode): ASTNode {
		return node;
	}

	protected visitBooleanNode(node: BooleanNode): ASTNode {
		return node;
	}

	protected visitNumberNode(node: NumberNode): ASTNode {
		return node;
	}

	protected visitStringNode(node: StringNode): ASTNode {
		return node;
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): ASTNode {
		const simplifiedExpr = this.visit(node.expr);
		switch (node.operator) {
			case "NOT":
				// If the inner expression is a boolean literal, we can simplify the NOT operation
				if (simplifiedExpr.type === "BOOLEAN_LITERAL") {
					return LiteralsBuilder.buildBooleanNode(
						!simplifiedExpr.value,
						node.position,
					);
				}
				return { ...node, expr: simplifiedExpr };
			case "-":
				// If the inner expression is a number literal, we can simplify the negation
				if (simplifiedExpr.type === "NUMBER_LITERAL") {
					return LiteralsBuilder.buildNumberNode(
						-simplifiedExpr.value,
						node.position,
					);
				}
				return { ...node, expr: simplifiedExpr };
		}
	}

	protected visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): ASTNode {
		const simplifiedLeft = this.visit(node.left);
		const simplifiedRight = this.visit(node.right);
		// If both sides are number literals, we can simplify the arithmetic operation
		if (
			simplifiedLeft.type === "NUMBER_LITERAL" &&
			simplifiedRight.type === "NUMBER_LITERAL"
		) {
			let result: number;
			switch (node.operator) {
				case "+":
					result = simplifiedLeft.value + simplifiedRight.value;
					break;
				case "-":
					result = simplifiedLeft.value - simplifiedRight.value;
					break;
				case "*":
					result = simplifiedLeft.value * simplifiedRight.value;
					break;
				case "/":
					if (simplifiedRight.value === 0) {
						throw new DivisionByZeroException(
							simplifiedLeft.value,
							simplifiedRight.value,
							node,
						);
					}
					result = simplifiedLeft.value / simplifiedRight.value;
					break;
			}
			return LiteralsBuilder.buildNumberNode(result, node.position);
		}
		return ExpressionsBuilder.buildArithmeticExpressionNode(
			node.operator,
			simplifiedLeft,
			simplifiedRight,
			node.position,
		);
	}

	protected visitComparisonExpressionNode(
		node: ComparisonExpressionNode,
	): ASTNode {
		const simplifiedLeft = this.visit(node.left);
		const simplifiedRight = this.visit(node.right);
		return ExpressionsBuilder.buildComparisonExpressionNode(
			node.operator,
			simplifiedLeft,
			simplifiedRight,
			node.position,
		);
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): ASTNode {
		switch (node.operator) {
			case "AND":
				return this.simplifyAndExpr(node);
			case "OR":
				return this.simplifyOrExpr(node);
		}
	}

	protected visitAssignStatementNode(node: AssignStatementNode): ASTNode {
		const simplifiedRight = this.visit(node.right);
		return StatementsBuilder.buildAssignStatementNode(
			node.left,
			simplifiedRight,
			node.position,
		);
	}

	protected visitIfControlNode(node: IfControlNode): ASTNode {
		const simplifiedCondition = this.visit(node.condition);
		const simplifiedTrueBranch = node.trueBranch.map((stmt) =>
			this.visit(stmt),
		);
		const simplifiedFalseBranch = node.falseBranch
			? node.falseBranch.map((stmt) => this.visit(stmt))
			: null;
		return ControlsBuilder.buildIfControlNode(
			simplifiedCondition,
			simplifiedTrueBranch,
			simplifiedFalseBranch,
			node.position,
		);
	}

	private simplifyAndExpr(node: LogicalExpressionNode): ASTNode {
		const simplifiedLeft = this.visit(node.left);
		const simplifiedRight = this.visit(node.right);
		//If both sides are boolean literals, we can simplify the AND operation
		if (
			simplifiedLeft.type === "BOOLEAN_LITERAL" &&
			simplifiedRight.type === "BOOLEAN_LITERAL"
		) {
			return LiteralsBuilder.buildBooleanNode(
				simplifiedLeft.value && simplifiedRight.value,
				node.position,
			);
		} else if (simplifiedLeft.type === "BOOLEAN_LITERAL") {
			// If the left side is a boolean literal, we can simplify based on its value
			if (simplifiedLeft.value) {
				// true AND x simplifies to x
				return simplifiedRight;
			} else {
				// false AND x simplifies to false
				return LiteralsBuilder.buildBooleanNode(false, node.position);
			}
		} else if (simplifiedRight.type === "BOOLEAN_LITERAL") {
			// If the right side is a boolean literal, we can simplify based on its value
			if (simplifiedRight.value) {
				// x AND true simplifies to x
				return simplifiedLeft;
			} else {
				// x AND false simplifies to false
				return LiteralsBuilder.buildBooleanNode(false, node.position);
			}
		}
		return ExpressionsBuilder.buildLogicalExpressionNode(
			node.operator,
			simplifiedLeft,
			simplifiedRight,
			node.position,
		);
	}

	private simplifyOrExpr(node: LogicalExpressionNode): ASTNode {
		const simplifiedOrLeft = this.visit(node.left);
		const simplifiedOrRight = this.visit(node.right);
		// If both sides are boolean literals, we can simplify the OR operation
		if (
			simplifiedOrLeft.type === "BOOLEAN_LITERAL" &&
			simplifiedOrRight.type === "BOOLEAN_LITERAL"
		) {
			return LiteralsBuilder.buildBooleanNode(
				simplifiedOrLeft.value || simplifiedOrRight.value,
				node.position,
			);
		} else if (simplifiedOrLeft.type === "BOOLEAN_LITERAL") {
			// If the left side is a boolean literal, we can simplify based on its value
			if (simplifiedOrLeft.value) {
				// true OR x simplifies to true
				return LiteralsBuilder.buildBooleanNode(true, node.position);
			} else {
				// false OR x simplifies to x
				return simplifiedOrRight;
			}
		} else if (simplifiedOrRight.type === "BOOLEAN_LITERAL") {
			// If the right side is a boolean literal, we can simplify based on its value
			if (simplifiedOrRight.value) {
				// x OR true simplifies to true
				return LiteralsBuilder.buildBooleanNode(true, node.position);
			} else {
				// x OR false simplifies to x
				return simplifiedOrLeft;
			}
		}
		return ExpressionsBuilder.buildLogicalExpressionNode(
			node.operator,
			simplifiedOrLeft,
			simplifiedOrRight,
			node.position,
		);
	}

	protected visitTimerBlockNode(node: TimerNode): ASTNode {
		return BlocksBuilder.buildTimerNode(
			node.timerType,
			this.visit(node.input),
			this.visit(node.lastInput),
			this.visit(node.presetTime),
			this.visit(node.elapsedTime),
			this.visit(node.output),
			node.position,
		);
	}

	protected visitTimerStringDeclarationNode(
		node: TimerStringDeclarationNode,
	): ASTNode {
		return BlocksBuilder.buildTimerStringDeclarationNode(
			node.name,
			this.visit(node.input),
			node.presetTime,
			node.position,
		);
	}

	protected visitCounterBlockNode(node: CounterNode): ASTNode {
		return BlocksBuilder.buildCounterNode(
			node.counterType,
			this.visit(node.input),
			this.visit(node.control),
			this.visit(node.presetValue),
			this.visit(node.currentValue),
			this.visit(node.output),
			node.position,
		);
	}
}
