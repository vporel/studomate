import IdentifiersBuilder from "./identifiers.builder";
import LiteralsBuilder from "./literals.builder";
import StatementsBuilder from "./statements.builder";

describe("StatementsBuilder", () => {
	describe("buildAssignStatementNode", () => {
		it("creates assign statement node", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("myVar", 0);
			const right = LiteralsBuilder.buildNumberNode(42, 10);
			const node = StatementsBuilder.buildAssignStatementNode(left, right, 0);

			expect(node.type).toBe("ASSIGN_STATEMENT");
			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
			expect(node.position).toBe(0);
			expect(node.id).toBeDefined();
		});

		it("creates assign statement with expression on right", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("result", 0);
			const right = IdentifiersBuilder.buildIdentifierNode("value", 10);
			const node = StatementsBuilder.buildAssignStatementNode(left, right, 5);

			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it("creates assign statement without position", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const right = LiteralsBuilder.buildNumberNode(10, 5);
			const node = StatementsBuilder.buildAssignStatementNode(left, right);

			expect(node.position).toBeUndefined();
		});

		it("generates unique IDs for each node", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("x", 0);
			const right = LiteralsBuilder.buildNumberNode(10, 5);
			const node1 = StatementsBuilder.buildAssignStatementNode(left, right);
			const node2 = StatementsBuilder.buildAssignStatementNode(left, right);

			expect(node1.id).not.toBe(node2.id);
		});

		it("creates assign statement with boolean value", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("flag", 0);
			const right = LiteralsBuilder.buildBooleanNode(true, 5);
			const node = StatementsBuilder.buildAssignStatementNode(left, right, 0);

			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});

		it("creates assign statement with string value", () => {
			const left = IdentifiersBuilder.buildIdentifierNode("message", 0);
			const right = LiteralsBuilder.buildStringNode("Hello", 10);
			const node = StatementsBuilder.buildAssignStatementNode(left, right, 0);

			expect(node.left).toBe(left);
			expect(node.right).toBe(right);
		});
	});
});
