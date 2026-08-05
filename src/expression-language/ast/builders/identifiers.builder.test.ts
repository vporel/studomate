import IdentifiersBuilder from "./identifiers.builder";

describe("IdentifiersBuilder", () => {
	describe("buildIdentifierNode", () => {
		it("creates identifier node with simple name", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("myVar", 10);

			expect(node.type).toBe("IDENTIFIER");
			expect(node.value).toBe("myVar");
			expect(node.position).toBe(10);
			expect(node.id).toBeDefined();
		});

		it("creates identifier node with uppercase name", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("MY_CONSTANT", 5);

			expect(node.value).toBe("MY_CONSTANT");
		});

		it("creates identifier node with numbers", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("var123", 0);

			expect(node.value).toBe("var123");
		});

		it("creates identifier node with underscores", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("my_variable_name", 15);

			expect(node.value).toBe("my_variable_name");
		});

		it("creates identifier node with single character", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("x", 20);

			expect(node.value).toBe("x");
		});

		it("generates unique IDs for each node", () => {
			const node1 = IdentifiersBuilder.buildIdentifierNode("myVar", 0);
			const node2 = IdentifiersBuilder.buildIdentifierNode("myVar", 0);

			expect(node1.id).not.toBe(node2.id);
		});

		it("generates unique IDs for different identifiers", () => {
			const node1 = IdentifiersBuilder.buildIdentifierNode("var1", 0);
			const node2 = IdentifiersBuilder.buildIdentifierNode("var2", 0);

			expect(node1.id).not.toBe(node2.id);
		});

		it("preserves position information", () => {
			const positions = [0, 10, 25, 100, 999];

			positions.forEach((pos) => {
				const node = IdentifiersBuilder.buildIdentifierNode("test", pos);
				expect(node.position).toBe(pos);
			});
		});
	});
});
