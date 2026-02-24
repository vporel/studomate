import { DivisionByZeroException } from "../exceptions/DivisionByZeroException.class";
import { AndNode, ArithmeticNode, ASTNode, NotNode, OrNode } from "../parser/AST";

export default class Simplifier {
	simplifyAST(node: ASTNode): ASTNode {
		switch (node.type) {
			case "ARITHMETIC":
				return this.simplifyArithmeticExpr(node);
			case "NOT":
				return this.simplifyNotExpr(node);
			case "AND":
				return this.simplifyAndExpr(node);
			case "OR":
				return this.simplifyOrExpr(node);
			default:
				return node;
		}
	}

	private simplifyArithmeticExpr(node: ArithmeticNode): ASTNode {
		const simplifiedLeft = this.simplifyAST(node.left);
		const simplifiedRight = this.simplifyAST(node.right);
		// If both sides are number literals, we can simplify the arithmetic operation
		if (simplifiedLeft.type === "NUMBER" && simplifiedRight.type === "NUMBER") {
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
						throw new DivisionByZeroException(simplifiedLeft.value, simplifiedRight.value);
					}
					result = simplifiedLeft.value / simplifiedRight.value;
					break;
				default:
					return { ...node, left: simplifiedLeft, right: simplifiedRight };
			}
			return { type: "NUMBER", value: result, position: node.position };
		}
		return { ...node, left: simplifiedLeft, right: simplifiedRight };
	}

	private simplifyNotExpr(node: NotNode): ASTNode {
		const simplifiedExpr = this.simplifyAST(node.expr);
		// If the inner expression is a boolean literal, we can simplify the NOT operation
		if (simplifiedExpr.type === "BOOLEAN") {
			return { type: "BOOLEAN", value: !simplifiedExpr.value, position: node.position };
		}
		return { ...node, expr: simplifiedExpr };
	}

	private simplifyAndExpr(node: AndNode): ASTNode {
		const simplifiedLeft = this.simplifyAST(node.left);
		const simplifiedRight = this.simplifyAST(node.right);
		//If both sides are boolean literals, we can simplify the AND operation
		if (simplifiedLeft.type === "BOOLEAN" && simplifiedRight.type === "BOOLEAN") {
			return {
				type: "BOOLEAN",
				value: simplifiedLeft.value && simplifiedRight.value,
				position: node.position,
			};
		} else if (simplifiedLeft.type === "BOOLEAN") {
			// If the left side is a boolean literal, we can simplify based on its value
			if (simplifiedLeft.value) {
				// true AND x simplifies to x
				return simplifiedRight;
			} else {
				// false AND x simplifies to false
				return { type: "BOOLEAN", value: false, position: node.position };
			}
		} else if (simplifiedRight.type === "BOOLEAN") {
			// If the right side is a boolean literal, we can simplify based on its value
			if (simplifiedRight.value) {
				// x AND true simplifies to x
				return simplifiedLeft;
			} else {
				// x AND false simplifies to false
				return { type: "BOOLEAN", value: false, position: node.position };
			}
		}
		return { ...node, left: simplifiedLeft, right: simplifiedRight };
	}

	private simplifyOrExpr(node: OrNode): ASTNode {
		const simplifiedOrLeft = this.simplifyAST(node.left);
		const simplifiedOrRight = this.simplifyAST(node.right);
		// If both sides are boolean literals, we can simplify the OR operation
		if (simplifiedOrLeft.type === "BOOLEAN" && simplifiedOrRight.type === "BOOLEAN") {
			return {
				type: "BOOLEAN",
				value: simplifiedOrLeft.value || simplifiedOrRight.value,
				position: node.position,
			};
		} else if (simplifiedOrLeft.type === "BOOLEAN") {
			// If the left side is a boolean literal, we can simplify based on its value
			if (simplifiedOrLeft.value) {
				// true OR x simplifies to true
				return { type: "BOOLEAN", value: true, position: node.position };
			} else {
				// false OR x simplifies to x
				return simplifiedOrRight;
			}
		} else if (simplifiedOrRight.type === "BOOLEAN") {
			// If the right side is a boolean literal, we can simplify based on its value
			if (simplifiedOrRight.value) {
				// x OR true simplifies to true
				return { type: "BOOLEAN", value: true, position: node.position };
			} else {
				// x OR false simplifies to x
				return simplifiedOrLeft;
			}
		}
		return { ...node, left: simplifiedOrLeft, right: simplifiedOrRight };
	}
}
