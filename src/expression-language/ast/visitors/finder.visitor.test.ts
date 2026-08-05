import BlocksBuilder from "../builders/blocks.builder";
import ControlsBuilder from "../builders/controls.builder";
import ExpressionsBuilder from "../builders/expressions.builder";
import IdentifiersBuilder from "../builders/identifiers.builder";
import LiteralsBuilder from "../builders/literals.builder";
import StatementsBuilder from "../builders/statements.builder";
import { ArithmeticExpressionNode } from "../nodes/expressions";
import { IdentifierNode } from "../nodes/identifiers";
import { NumberNode } from "../nodes/literals";
import FinderVisitor from "./finder.visitor";

describe("FinderVisitor", () => {
	describe("finding identifier nodes", () => {
		it("finds single identifier node", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(node);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(node);
		});

		it("finds multiple identifier nodes in expression", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("y", 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode("+", id1, id2);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(expr);

			expect(result).toHaveLength(2);
			expect(result).toContain(id1);
			expect(result).toContain(id2);
		});

		it("finds identifier nodes in nested expressions", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("a", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("b", 5);
			const id3 = IdentifiersBuilder.buildIdentifierNode("c", 10);

			const expr1 = ExpressionsBuilder.buildArithmeticExpressionNode("+", id1, id2);
			const expr2 = ExpressionsBuilder.buildArithmeticExpressionNode("*", expr1, id3);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(expr2);

			expect(result).toHaveLength(3);
			expect(result).toContain(id1);
			expect(result).toContain(id2);
			expect(result).toContain(id3);
		});

		it("finds identifier nodes in if control", () => {
			const condId = IdentifiersBuilder.buildIdentifierNode("flag", 0);
			const leftId = IdentifiersBuilder.buildIdentifierNode("x", 5);
			const rightId = IdentifiersBuilder.buildIdentifierNode("y", 10);

			const assign = StatementsBuilder.buildAssignStatementNode(leftId, rightId);
			const ifNode = ControlsBuilder.buildIfControlNode(condId, [assign], null);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(ifNode);

			expect(result).toHaveLength(3);
			expect(result).toContain(condId);
			expect(result).toContain(leftId);
			expect(result).toContain(rightId);
		});
	});

	describe("finding number nodes", () => {
		it("finds single number node", () => {
			const node = LiteralsBuilder.buildNumberNode(42, 0);
			const visitor = new FinderVisitor<NumberNode>("NUMBER_LITERAL");
			const result = visitor.visit(node);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(node);
		});

		it("finds number nodes in arithmetic expression", () => {
			const num1 = LiteralsBuilder.buildNumberNode(5, 0);
			const num2 = LiteralsBuilder.buildNumberNode(10, 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode("+", num1, num2);

			const visitor = new FinderVisitor<NumberNode>("NUMBER_LITERAL");
			const result = visitor.visit(expr);

			expect(result).toHaveLength(2);
			expect(result).toContain(num1);
			expect(result).toContain(num2);
		});

		it("finds number nodes in complex nested expression", () => {
			const num1 = LiteralsBuilder.buildNumberNode(1, 0);
			const num2 = LiteralsBuilder.buildNumberNode(2, 5);
			const num3 = LiteralsBuilder.buildNumberNode(3, 10);
			const num4 = LiteralsBuilder.buildNumberNode(4, 15);

			const expr1 = ExpressionsBuilder.buildArithmeticExpressionNode("+", num1, num2);
			const expr2 = ExpressionsBuilder.buildArithmeticExpressionNode("*", num3, num4);
			const finalExpr = ExpressionsBuilder.buildArithmeticExpressionNode("-", expr1, expr2);

			const visitor = new FinderVisitor<NumberNode>("NUMBER_LITERAL");
			const result = visitor.visit(finalExpr);

			expect(result).toHaveLength(4);
			expect(result).toContain(num1);
			expect(result).toContain(num2);
			expect(result).toContain(num3);
			expect(result).toContain(num4);
		});

		it("returns empty array when no numbers found", () => {
			const id = IdentifiersBuilder.buildIdentifierNode("x", 0);

			const visitor = new FinderVisitor<NumberNode>("NUMBER_LITERAL");
			const result = visitor.visit(id);

			expect(result).toEqual([]);
		});
	});

	describe("finding expression nodes", () => {
		it("finds arithmetic expression nodes", () => {
			const num1 = LiteralsBuilder.buildNumberNode(5, 0);
			const num2 = LiteralsBuilder.buildNumberNode(10, 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode("+", num1, num2);

			const visitor = new FinderVisitor<ArithmeticExpressionNode>("ARITHMETIC_EXPRESSION");
			const result = visitor.visit(expr);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(expr);
		});

		it("finds nested arithmetic expressions", () => {
			const num1 = LiteralsBuilder.buildNumberNode(1, 0);
			const num2 = LiteralsBuilder.buildNumberNode(2, 5);
			const num3 = LiteralsBuilder.buildNumberNode(3, 10);

			const innerExpr = ExpressionsBuilder.buildArithmeticExpressionNode("+", num1, num2);
			const outerExpr = ExpressionsBuilder.buildArithmeticExpressionNode("*", innerExpr, num3);

			const visitor = new FinderVisitor<ArithmeticExpressionNode>("ARITHMETIC_EXPRESSION");
			const result = visitor.visit(outerExpr);

			expect(result).toHaveLength(2);
			expect(result).toContain(innerExpr);
			expect(result).toContain(outerExpr);
		});
	});

	describe("finding nodes in statements", () => {
		it("finds identifiers in assign statement", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("result", 0);
			const right = IdentifiersBuilder.buildIdentifierNode("value", 10);
			const assign = StatementsBuilder.buildAssignStatementNode(left, right);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(assign);

			expect(result).toHaveLength(2);
			expect(result).toContain(left);
			expect(result).toContain(right);
		});

		it("finds numbers in assign statement", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const num1 = LiteralsBuilder.buildNumberNode(5, 5);
			const num2 = LiteralsBuilder.buildNumberNode(3, 10);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode("+", num1, num2);
			const assign = StatementsBuilder.buildAssignStatementNode(left, expr);

			const visitor = new FinderVisitor<NumberNode>("NUMBER_LITERAL");
			const result = visitor.visit(assign);

			expect(result).toHaveLength(2);
			expect(result).toContain(num1);
			expect(result).toContain(num2);
		});
	});

	describe("finding nodes in control structures", () => {
		it("finds all nodes in if control with both branches", () => {
			const condId = IdentifiersBuilder.buildIdentifierNode("condition", 0);
			const trueId = IdentifiersBuilder.buildIdentifierNode("trueVar", 5);
			const falseId = IdentifiersBuilder.buildIdentifierNode("falseVar", 10);
			const num1 = LiteralsBuilder.buildNumberNode(1, 15);
			const num2 = LiteralsBuilder.buildNumberNode(2, 20);

			const trueAssign = StatementsBuilder.buildAssignStatementNode(trueId, num1);
			const falseAssign = StatementsBuilder.buildAssignStatementNode(falseId, num2);
			const ifNode = ControlsBuilder.buildIfControlNode(condId, [trueAssign], [falseAssign]);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(ifNode);

			expect(result).toHaveLength(3);
			expect(result).toContain(condId);
			expect(result).toContain(trueId);
			expect(result).toContain(falseId);
		});
	});

	describe("finding nodes in timer blocks", () => {
		it("finds identifiers in timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("start", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastStart", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(1000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("done", 20);

			const timer = BlocksBuilder.buildTimerNode(
				"TON",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(timer);

			expect(result).toHaveLength(4);
			expect(result).toContain(input);
			expect(result).toContain(lastInput);
			expect(result).toContain(elapsedTime);
			expect(result).toContain(output);
		});

		it("finds number in timer string declaration", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("trigger", 0);
			const timer = BlocksBuilder.buildTimerStringDeclarationNode("myTimer", input, 1500);

			const visitor = new FinderVisitor<IdentifierNode>("IDENTIFIER");
			const result = visitor.visit(timer);

			expect(result).toHaveLength(1);
			expect(result[0]).toBe(input);
		});
	});
});
