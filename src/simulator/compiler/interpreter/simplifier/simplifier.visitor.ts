import ExpressionsBuilder from "../../ast/builders/expressions.builder";
import LiteralsBuilder from "../../ast/builders/literals.builder";
import { ASTNode } from "../../ast/nodes/ast-node";
import { TimerNode, TimerStringDeclarationNode } from "../../ast/nodes/blocks";
import { IfControlNode } from "../../ast/nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../../ast/nodes/expressions";
import { IdentifierNode } from "../../ast/nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../../ast/nodes/literals";
import { AssignStatementNode } from "../../ast/nodes/statements";
import { BaseVisitor } from "../../ast/visitors/base.visitor";
import { DivisionByZeroException } from "../evaluator/exceptions/division-by-zero.exception";

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
		switch (node.operator) {
			case "NOT":
				const simplifiedExpr = this.visit(node.expr);
				// If the inner expression is a boolean literal, we can simplify the NOT operation
				if (simplifiedExpr.type === "BOOLEAN_LITERAL") {
					return LiteralsBuilder.buildBooleanNode(!simplifiedExpr.value, node.position);
				}
				return { ...node, expr: simplifiedExpr };
		}
	}

	protected visitArithmeticExpressionNode(node: ArithmeticExpressionNode): ASTNode {
		const simplifiedLeft = this.visit(node.left);
		const simplifiedRight = this.visit(node.right);
		// If both sides are number literals, we can simplify the arithmetic operation
		if (simplifiedLeft.type === "NUMBER_LITERAL" && simplifiedRight.type === "NUMBER_LITERAL") {
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
						throw new DivisionByZeroException(simplifiedLeft.value, simplifiedRight.value, node);
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

	protected visitComparisonExpressionNode(node: ComparisonExpressionNode): ASTNode {
		return node;
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
		return node;
	}

	protected visitIfControlNode(node: IfControlNode): ASTNode {
		return node;
	}

	private simplifyAndExpr(node: LogicalExpressionNode): ASTNode {
		const simplifiedLeft = this.visit(node.left);
		const simplifiedRight = this.visit(node.right);
		//If both sides are boolean literals, we can simplify the AND operation
		if (simplifiedLeft.type === "BOOLEAN_LITERAL" && simplifiedRight.type === "BOOLEAN_LITERAL") {
			return {
				type: "BOOLEAN_LITERAL",
				value: simplifiedLeft.value && simplifiedRight.value,
				position: node.position,
			};
		} else if (simplifiedLeft.type === "BOOLEAN_LITERAL") {
			// If the left side is a boolean literal, we can simplify based on its value
			if (simplifiedLeft.value) {
				// true AND x simplifies to x
				return simplifiedRight;
			} else {
				// false AND x simplifies to false
				return { type: "BOOLEAN_LITERAL", value: false, position: node.position };
			}
		} else if (simplifiedRight.type === "BOOLEAN_LITERAL") {
			// If the right side is a boolean literal, we can simplify based on its value
			if (simplifiedRight.value) {
				// x AND true simplifies to x
				return simplifiedLeft;
			} else {
				// x AND false simplifies to false
				return { type: "BOOLEAN_LITERAL", value: false, position: node.position };
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
		if (simplifiedOrLeft.type === "BOOLEAN_LITERAL" && simplifiedOrRight.type === "BOOLEAN_LITERAL") {
			return {
				type: "BOOLEAN_LITERAL",
				value: simplifiedOrLeft.value || simplifiedOrRight.value,
				position: node.position,
			};
		} else if (simplifiedOrLeft.type === "BOOLEAN_LITERAL") {
			// If the left side is a boolean literal, we can simplify based on its value
			if (simplifiedOrLeft.value) {
				// true OR x simplifies to true
				return { type: "BOOLEAN_LITERAL", value: true, position: node.position };
			} else {
				// false OR x simplifies to x
				return simplifiedOrRight;
			}
		} else if (simplifiedOrRight.type === "BOOLEAN_LITERAL") {
			// If the right side is a boolean literal, we can simplify based on its value
			if (simplifiedOrRight.value) {
				// x OR true simplifies to true
				return { type: "BOOLEAN_LITERAL", value: true, position: node.position };
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
		return node;
	}

	protected visitTimerStringDeclarationNode(node: TimerStringDeclarationNode): ASTNode {
		return node;
	}
}
