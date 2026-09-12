import BlocksBuilder from "../builders/blocks.builder";
import ControlsBuilder from "../builders/controls.builder";
import ExpressionsBuilder from "../builders/expressions.builder";
import IdentifiersBuilder from "../builders/identifiers.builder";
import LiteralsBuilder from "../builders/literals.builder";
import StatementsBuilder from "../builders/statements.builder";
import { IdentifierNode } from "../nodes/identifiers";
import { NumberNode } from "../nodes/literals";
import ReplacerVisitor, {
	ReplacerVisitorReplacement,
} from "./replacer.visitor";

describe("ReplacerVisitor", () => {
	describe("replacing identifier nodes", () => {
		it("replaces single identifier by name", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const replacement = IdentifiersBuilder.buildIdentifierNode("y", 0);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "x",
					replacement,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(node);

			expect(result).toBe(replacement);
		});

		it("replaces identifier in expression", () => {
			const oldId = IdentifiersBuilder.buildIdentifierNode("old", 0);
			const newId = IdentifiersBuilder.buildIdentifierNode("new", 0);
			const number = LiteralsBuilder.buildNumberNode(5, 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				oldId,
				number,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "old",
					replacement: newId,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(expr);

			expect(result.type).toBe("ARITHMETIC_EXPRESSION");
			expect((result as any).left).toBe(newId);
			expect((result as any).right).toBe(number);
		});

		it("replaces multiple different identifiers", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("a", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("b", 5);
			const newId1 = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const newId2 = IdentifiersBuilder.buildIdentifierNode("y", 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id1,
				id2,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "a",
					replacement: newId1,
				},
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "b",
					replacement: newId2,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(expr);

			expect((result as any).left).toBe(newId1);
			expect((result as any).right).toBe(newId2);
		});

		it("does not replace identifiers that don't match", () => {
			const id = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const replacement = IdentifiersBuilder.buildIdentifierNode("y", 0);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "z",
					replacement,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(id);

			expect(result).toBe(id);
		});
	});

	describe("replacing number nodes", () => {
		it("replaces number by value", () => {
			const oldNum = LiteralsBuilder.buildNumberNode(42, 0);
			const newNum = LiteralsBuilder.buildNumberNode(100, 0);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 42,
					replacement: newNum,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(oldNum);

			expect(result).toBe(newNum);
		});

		it("replaces number in arithmetic expression", () => {
			const num1 = LiteralsBuilder.buildNumberNode(5, 0);
			const num2 = LiteralsBuilder.buildNumberNode(10, 5);
			const newNum = LiteralsBuilder.buildNumberNode(20, 0);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				num1,
				num2,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 10,
					replacement: newNum,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(expr);

			expect((result as any).left).toBe(num1);
			expect((result as any).right).toBe(newNum);
		});

		it("replaces multiple numbers", () => {
			const num1 = LiteralsBuilder.buildNumberNode(1, 0);
			const num2 = LiteralsBuilder.buildNumberNode(2, 5);
			const newNum1 = LiteralsBuilder.buildNumberNode(10, 0);
			const newNum2 = LiteralsBuilder.buildNumberNode(20, 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"*",
				num1,
				num2,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 1,
					replacement: newNum1,
				},
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 2,
					replacement: newNum2,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(expr);

			expect((result as any).left).toBe(newNum1);
			expect((result as any).right).toBe(newNum2);
		});
	});

	describe("replacing in nested expressions", () => {
		it("replaces identifier in deeply nested expression", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("y", 5);
			const id3 = IdentifiersBuilder.buildIdentifierNode("z", 10);
			const newId = IdentifiersBuilder.buildIdentifierNode("replaced", 0);

			const innerExpr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id1,
				id2,
			);
			const outerExpr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"*",
				innerExpr,
				id3,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "y",
					replacement: newId,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(outerExpr);

			const innerResult = (result as any).left;
			expect(innerResult.left).toBe(id1);
			expect(innerResult.right).toBe(newId);
			expect((result as any).right).toBe(id3);
		});

		it("replaces all matching nodes in nested structure", () => {
			const num1 = LiteralsBuilder.buildNumberNode(5, 0);
			const num2 = LiteralsBuilder.buildNumberNode(5, 5);
			const num3 = LiteralsBuilder.buildNumberNode(10, 10);
			const newNum = LiteralsBuilder.buildNumberNode(99, 0);

			const innerExpr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				num1,
				num2,
			);
			const outerExpr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"-",
				innerExpr,
				num3,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 5,
					replacement: newNum,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(outerExpr);

			// Both instances of 5 should be replaced
			const innerResult = (result as any).left;
			expect(innerResult.left).toBe(newNum);
			expect(innerResult.right).toBe(newNum);
			expect((result as any).right).toBe(num3);
		});
	});

	describe("replacing in statements", () => {
		it("replaces identifier in assign statement", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const right = IdentifiersBuilder.buildIdentifierNode("y", 5);
			const newRight = IdentifiersBuilder.buildIdentifierNode("z", 5);
			const assign = StatementsBuilder.buildAssignStatementNode(left, right);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "y",
					replacement: newRight,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(assign);

			expect((result as any).left).toBe(left);
			expect((result as any).right).toBe(newRight);
		});

		it("replaces number in expression on right side of assign", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("result", 0);
			const num1 = LiteralsBuilder.buildNumberNode(10, 5);
			const num2 = LiteralsBuilder.buildNumberNode(20, 10);
			const newNum = LiteralsBuilder.buildNumberNode(30, 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				num1,
				num2,
			);
			const assign = StatementsBuilder.buildAssignStatementNode(left, expr);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 10,
					replacement: newNum,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(assign);

			const rightExpr = (result as any).right;
			expect(rightExpr.left).toBe(newNum);
			expect(rightExpr.right).toBe(num2);
		});
	});

	describe("replacing in control structures", () => {
		it("replaces identifier in if condition", () => {
			const oldCond = IdentifiersBuilder.buildIdentifierNode("flag", 0);
			const newCond = LiteralsBuilder.buildBooleanNode(true, 0);
			const assign = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("x", 5),
				LiteralsBuilder.buildNumberNode(1, 10),
			);
			const ifNode = ControlsBuilder.buildIfControlNode(
				oldCond,
				[assign],
				null,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "flag",
					replacement: newCond,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(ifNode);

			expect((result as any).condition).toBe(newCond);
		});

		it("replaces nodes in both branches of if control", () => {
			const cond = LiteralsBuilder.buildBooleanNode(true, 0);
			const trueId = IdentifiersBuilder.buildIdentifierNode("trueVar", 5);
			const falseId = IdentifiersBuilder.buildIdentifierNode("falseVar", 10);
			const num1 = LiteralsBuilder.buildNumberNode(1, 15);
			const num2 = LiteralsBuilder.buildNumberNode(2, 20);
			const newNum = LiteralsBuilder.buildNumberNode(99, 0);

			const trueAssign = StatementsBuilder.buildAssignStatementNode(
				trueId,
				num1,
			);
			const falseAssign = StatementsBuilder.buildAssignStatementNode(
				falseId,
				num2,
			);
			const ifNode = ControlsBuilder.buildIfControlNode(
				cond,
				[trueAssign],
				[falseAssign],
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" &&
						((n as NumberNode).value === 1 || (n as NumberNode).value === 2),
					replacement: newNum,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(ifNode);

			expect(((result as any).trueBranch[0] as any).right).toBe(newNum);
			expect(((result as any).falseBranch[0] as any).right).toBe(newNum);
		});
	});

	describe("replacing in timer blocks", () => {
		it("replaces identifier in timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("start", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastStart", 5);
			const presetTime = LiteralsBuilder.buildNumberNode(1000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("done", 20);
			const newInput = IdentifiersBuilder.buildIdentifierNode("trigger", 0);

			const timer = BlocksBuilder.buildTimerNode(
				"TON",
				input,
				lastInput,
				presetTime,
				elapsedTime,
				output,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "IDENTIFIER" && (n as IdentifierNode).value === "start",
					replacement: newInput,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(timer);

			expect((result as any).input).toBe(newInput);
			expect((result as any).lastInput).toBe(lastInput);
		});

		it("replaces preset time in timer node", () => {
			const input = IdentifiersBuilder.buildIdentifierNode("input", 0);
			const lastInput = IdentifiersBuilder.buildIdentifierNode("lastInput", 5);
			const oldPreset = LiteralsBuilder.buildNumberNode(1000, 10);
			const elapsedTime = IdentifiersBuilder.buildIdentifierNode("elapsed", 15);
			const output = IdentifiersBuilder.buildIdentifierNode("output", 20);
			const newPreset = LiteralsBuilder.buildNumberNode(2000, 10);

			const timer = BlocksBuilder.buildTimerNode(
				"TOF",
				input,
				lastInput,
				oldPreset,
				elapsedTime,
				output,
			);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "NUMBER_LITERAL" && (n as NumberNode).value === 1000,
					replacement: newPreset,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(timer);

			expect((result as any).presetTime).toBe(newPreset);
		});
	});

	describe("children are lost when parent is replaced", () => {
		it("loses children when expression is replaced", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("y", 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id1,
				id2,
			);
			const replacement = LiteralsBuilder.buildNumberNode(42, 0);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) => n.type === "ARITHMETIC_EXPRESSION",
					replacement,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(expr);

			// The entire expression is replaced, children are lost
			expect(result).toBe(replacement);
			expect(result.type).toBe("NUMBER_LITERAL");
		});

		it("loses nested children when parent expression is replaced", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("a", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("b", 5);
			const id3 = IdentifiersBuilder.buildIdentifierNode("c", 10);
			const innerExpr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id1,
				id2,
			);
			const outerExpr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"*",
				innerExpr,
				id3,
			);
			const replacement = LiteralsBuilder.buildNumberNode(999, 0);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: (n) =>
						n.type === "ARITHMETIC_EXPRESSION" && (n as any).operator === "*",
					replacement,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(outerExpr);

			// The entire outer expression is replaced, all children (including innerExpr) are lost
			expect(result).toBe(replacement);
			expect(result.type).toBe("NUMBER_LITERAL");
		});
	});

	describe("no replacements", () => {
		it("returns original tree when no replacements provided", () => {
			const id1 = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const id2 = IdentifiersBuilder.buildIdentifierNode("y", 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id1,
				id2,
			);

			const visitor = new ReplacerVisitor([]);
			const result = visitor.visit(expr);

			expect((result as any).left).toBe(id1);
			expect((result as any).right).toBe(id2);
		});

		it("returns original tree when no predicates match", () => {
			const id = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const num = LiteralsBuilder.buildNumberNode(5, 5);
			const expr = ExpressionsBuilder.buildArithmeticExpressionNode(
				"+",
				id,
				num,
			);
			const replacement = LiteralsBuilder.buildBooleanNode(true, 0);

			const replacements: ReplacerVisitorReplacement[] = [
				{
					predicate: () => false,
					replacement,
				},
			];

			const visitor = new ReplacerVisitor(replacements);
			const result = visitor.visit(expr);

			expect((result as any).left).toBe(id);
			expect((result as any).right).toBe(num);
		});
	});
});
