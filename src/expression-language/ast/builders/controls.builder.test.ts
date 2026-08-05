import ControlsBuilder from "./controls.builder";
import ExpressionsBuilder from "./expressions.builder";
import IdentifiersBuilder from "./identifiers.builder";
import LiteralsBuilder from "./literals.builder";
import StatementsBuilder from "./statements.builder";

describe("ControlsBuilder", () => {
	describe("buildIfControlNode", () => {
		it("creates if control node with true and false branches", () => {
			const condition = ExpressionsBuilder.buildComparisonExpressionNode(
				">",
				IdentifiersBuilder.buildIdentifierNode("x", 0),
				LiteralsBuilder.buildNumberNode(10, 5),
			);
			const trueBranch = [
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("result", 0),
					LiteralsBuilder.buildBooleanNode(true, 5),
				),
			];
			const falseBranch = [
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("result", 0),
					LiteralsBuilder.buildBooleanNode(false, 5),
				),
			];

			const node = ControlsBuilder.buildIfControlNode(condition, trueBranch, falseBranch, 0);

			expect(node.type).toBe("IF_CONTROL");
			expect(node.condition).toBe(condition);
			expect(node.trueBranch).toBe(trueBranch);
			expect(node.falseBranch).toBe(falseBranch);
			expect(node.position).toBe(0);
			expect(node.id).toBeDefined();
		});

		it("creates if control node without false branch", () => {
			const condition = LiteralsBuilder.buildBooleanNode(true, 0);
			const trueBranch = [
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("x", 0),
					LiteralsBuilder.buildNumberNode(5, 5),
				),
			];

			const node = ControlsBuilder.buildIfControlNode(condition, trueBranch, null, 0);

			expect(node.condition).toBe(condition);
			expect(node.trueBranch).toBe(trueBranch);
			expect(node.falseBranch).toBeNull();
		});

		it("creates if control node with empty branches", () => {
			const condition = LiteralsBuilder.buildBooleanNode(false, 0);
			const trueBranch: any[] = [];
			const falseBranch: any[] = [];

			const node = ControlsBuilder.buildIfControlNode(condition, trueBranch, falseBranch);

			expect(node.trueBranch).toEqual([]);
			expect(node.falseBranch).toEqual([]);
		});

		it("creates if control node with multiple statements in branches", () => {
			const condition = IdentifiersBuilder.buildIdentifierNode("flag", 0);
			const trueBranch = [
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("a", 0),
					LiteralsBuilder.buildNumberNode(1, 5),
				),
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("b", 0),
					LiteralsBuilder.buildNumberNode(2, 5),
				),
			];
			const falseBranch = [
				StatementsBuilder.buildAssignStatementNode(
					IdentifiersBuilder.buildIdentifierNode("a", 0),
					LiteralsBuilder.buildNumberNode(3, 5),
				),
			];

			const node = ControlsBuilder.buildIfControlNode(condition, trueBranch, falseBranch);

			expect(node.trueBranch.length).toBe(2);
			expect(node.falseBranch?.length).toBe(1);
		});

		it("creates if control node without position", () => {
			const condition = LiteralsBuilder.buildBooleanNode(true, 0);
			const trueBranch: any[] = [];

			const node = ControlsBuilder.buildIfControlNode(condition, trueBranch, null);

			expect(node.position).toBeUndefined();
		});

		it("generates unique IDs for each node", () => {
			const condition = LiteralsBuilder.buildBooleanNode(true, 0);
			const trueBranch: any[] = [];
			const node1 = ControlsBuilder.buildIfControlNode(condition, trueBranch, null);
			const node2 = ControlsBuilder.buildIfControlNode(condition, trueBranch, null);

			expect(node1.id).not.toBe(node2.id);
		});
	});
});
