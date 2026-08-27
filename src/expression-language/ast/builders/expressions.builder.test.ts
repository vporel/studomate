import ExpressionsBuilder from "./expressions.builder";
import IdentifiersBuilder from "./identifiers.builder";
import LiteralsBuilder from "./literals.builder";

describe("ExpressionsBuilder", () => {
	describe("buildUnaryExpressionNode", () => {
		it("creates NOT expression node", () => {
			const expr = LiteralsBuilder.buildBooleanNode(true, 0);
			const node = ExpressionsBuilder.buildUnaryExpressionNode("NOT", expr, 5);

			expect(node.type).toBe("UNARY_EXPRESSION");
			expect(node.operator).toBe("NOT");
			expect(node.expr).toBe(expr);
			expect(node.position).toBe(5);
			expect(node.id).toBeDefined();
		});
	});

	describe("buildArithmeticExpressionNode", () => {
		it("creates addition expression node", () => {
			const left = LiteralsBuilder.buildNumberNode(5, 0);
			const right = LiteralsBuilder.buildNumberNode(3, 2);
			const node = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				left,
				right,
				0,
			);

			expect(node.type).toBe("ARITHMETIC_EXPRESSION");
			expect(node.operator).toBe("+");
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
			expect(node.id).toBeDefined();
		});

		it("creates subtraction expression node", () => {
			const left = LiteralsBuilder.buildNumberNode(10, 0);
			const right = LiteralsBuilder.buildNumberNode(4, 2);
			const node = ExpressionsBuilder.buildArithmeticExpressionNode(
				"-",
				left,
				right,
			);

			expect(node.operator).toBe("-");
		});

		it("creates multiplication expression node", () => {
			const left = LiteralsBuilder.buildNumberNode(6, 0);
			const right = LiteralsBuilder.buildNumberNode(7, 2);
			const node = ExpressionsBuilder.buildArithmeticExpressionNode(
				"*",
				left,
				right,
			);

			expect(node.operator).toBe("*");
		});

		it("creates division expression node", () => {
			const left = LiteralsBuilder.buildNumberNode(20, 0);
			const right = LiteralsBuilder.buildNumberNode(4, 2);
			const node = ExpressionsBuilder.buildArithmeticExpressionNode(
				"/",
				left,
				right,
			);

			expect(node.operator).toBe("/");
		});
	});

	describe("buildComparisonExpressionNode", () => {
		it("creates equality comparison node", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const right = LiteralsBuilder.buildNumberNode(10, 5);
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				"=",
				left,
				right,
				0,
			);

			expect(node.type).toBe("COMPARISON_EXPRESSION");
			expect(node.operator).toBe("=");
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it("creates inequality comparison node", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const right = LiteralsBuilder.buildNumberNode(5, 5);
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				"!=",
				left,
				right,
			);

			expect(node.operator).toBe("!=");
		});

		it("creates less than comparison node", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("y", 0);
			const right = IdentifiersBuilder.buildIdentifierNode("x", 5);
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				"<",
				left,
				right,
			);

			expect(node.operator).toBe("<");
		});

		it("creates greater than or equal comparison node", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const right = LiteralsBuilder.buildNumberNode(10, 5);
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				">=",
				left,
				right,
			);

			expect(node.operator).toBe(">=");
		});
	});

	describe("buildLogicalExpressionNode", () => {
		it("creates AND expression node", () => {
			const left = LiteralsBuilder.buildBooleanNode(true, 0);
			const right = LiteralsBuilder.buildBooleanNode(false, 5);
			const node = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				left,
				right,
				0,
			);

			expect(node.type).toBe("LOGICAL_EXPRESSION");
			expect(node.operator).toBe("AND");
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it("creates OR expression node", () => {
			const left = LiteralsBuilder.buildBooleanNode(true, 0);
			const right = LiteralsBuilder.buildBooleanNode(false, 5);
			const node = ExpressionsBuilder.buildLogicalExpressionNode(
				"OR",
				left,
				right,
			);

			expect(node.operator).toBe("OR");
		});
	});

	describe("buildChainedLogicalExpressionNode", () => {
		it("chains multiple AND expressions", () => {
			const expr1 = LiteralsBuilder.buildBooleanNode(true, 0);
			const expr2 = LiteralsBuilder.buildBooleanNode(false, 5);
			const expr3 = LiteralsBuilder.buildBooleanNode(true, 10);

			const node = ExpressionsBuilder.buildChainedLogicalExpressionNode(
				"AND",
				[expr1, expr2, expr3],
				0,
			);

			expect(node.type).toBe("LOGICAL_EXPRESSION");
			expect(node.operator).toBe("AND");
			// Should create: (expr1 AND expr2) AND expr3
			expect((node.left as any).type).toBe("LOGICAL_EXPRESSION");
			expect(node.right).toBe(expr3);
		});

		it("chains multiple OR expressions", () => {
			const expr1 = LiteralsBuilder.buildBooleanNode(true, 0);
			const expr2 = LiteralsBuilder.buildBooleanNode(false, 5);

			const node = ExpressionsBuilder.buildChainedLogicalExpressionNode("OR", [
				expr1,
				expr2,
			]);

			expect(node.operator).toBe("OR");
			expect(node.left).toBe(expr1);
			expect(node.right).toBe(expr2);
		});

		it("throws on single expression", () => {
			const expr1 = LiteralsBuilder.buildBooleanNode(true, 0);

			expect(() =>
				ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", [expr1]),
			).toThrow("At least two expressions are required");
		});

		it("throws on empty expressions", () => {
			expect(() =>
				ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", []),
			).toThrow("At least two expressions are required");
		});

		it("chains four expressions correctly", () => {
			const expr1 = LiteralsBuilder.buildBooleanNode(true, 0);
			const expr2 = LiteralsBuilder.buildBooleanNode(false, 5);
			const expr3 = LiteralsBuilder.buildBooleanNode(true, 10);
			const expr4 = LiteralsBuilder.buildBooleanNode(false, 15);

			const node = ExpressionsBuilder.buildChainedLogicalExpressionNode("OR", [
				expr1,
				expr2,
				expr3,
				expr4,
			]);

			// Should create: ((expr1 OR expr2) OR expr3) OR expr4
			expect(node.right).toBe(expr4);
			const level2 = node.left as any;
			expect(level2.type).toBe("LOGICAL_EXPRESSION");
			expect(level2.right).toBe(expr3);
			const level3 = level2.left as any;
			expect(level3.type).toBe("LOGICAL_EXPRESSION");
			expect(level3.left).toBe(expr1);
			expect(level3.right).toBe(expr2);
		});
	});

	describe("unique IDs", () => {
		it("generates unique IDs for each node", () => {
			const node1 = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildNumberNode(2, 0),
			);
			const node2 = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildNumberNode(2, 0),
			);

			expect(node1.id).toBeDefined();
			expect(node2.id).toBeDefined();
			expect(node1.id).not.toBe(node2.id);
		});
	});
});
