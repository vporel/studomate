import LiteralsBuilder from "./literals.builder";

describe("LiteralsBuilder", () => {
	describe("buildBooleanNode", () => {
		it("creates boolean node with true value", () => {
			const node = LiteralsBuilder.buildBooleanNode(true, 10);

			expect(node.type).toBe("BOOLEAN_LITERAL");
			expect(node.value).toBe(true);
			expect(node.position).toBe(10);
			expect(node.id).toBeDefined();
		});

		it("creates boolean node with false value", () => {
			const node = LiteralsBuilder.buildBooleanNode(false, 5);
			
			expect(node.type).toBe("BOOLEAN_LITERAL");
			expect(node.value).toBe(false);
			expect(node.position).toBe(5);
		});

		it("generates unique IDs for each node", () => {
			const node1 = LiteralsBuilder.buildBooleanNode(true, 0);
			const node2 = LiteralsBuilder.buildBooleanNode(true, 0);
			
			expect(node1.id).not.toBe(node2.id);
		});
	});

	describe("buildNumberNode", () => {
		it("creates number node with integer value", () => {
			const node = LiteralsBuilder.buildNumberNode(42, 15);
			
			expect(node.type).toBe("NUMBER_LITERAL");
			expect(node.value).toBe(42);
			expect(node.position).toBe(15);
			expect(node.id).toBeDefined();
		});

		it("creates number node with decimal value", () => {
			const node = LiteralsBuilder.buildNumberNode(3.14, 20);
			
			expect(node.type).toBe("NUMBER_LITERAL");
			expect(node.value).toBe(3.14);
			expect(node.position).toBe(20);
		});

		it("creates number node with negative value", () => {
			const node = LiteralsBuilder.buildNumberNode(-100, 0);
			
			expect(node.value).toBe(-100);
		});

		it("creates number node with zero", () => {
			const node = LiteralsBuilder.buildNumberNode(0, 0);
			
			expect(node.value).toBe(0);
		});

		it("generates unique IDs for each node", () => {
			const node1 = LiteralsBuilder.buildNumberNode(42, 0);
			const node2 = LiteralsBuilder.buildNumberNode(42, 0);
			
			expect(node1.id).not.toBe(node2.id);
		});
	});

	describe("buildStringNode", () => {
		it("creates string node with text value", () => {
			const node = LiteralsBuilder.buildStringNode("Hello", 25);
			
			expect(node.type).toBe("STRING_LITERAL");
			expect(node.value).toBe("Hello");
			expect(node.position).toBe(25);
			expect(node.id).toBeDefined();
		});

		it("creates string node with empty value", () => {
			const node = LiteralsBuilder.buildStringNode("", 0);

			expect(node.value).toBe("");
		});

		it("creates string node with special characters", () => {
			const node = LiteralsBuilder.buildStringNode("Hello\nWorld\t!", 0);

			expect(node.value).toBe("Hello\nWorld\t!");
		});

		it("generates unique IDs for each node", () => {
			const node1 = LiteralsBuilder.buildStringNode("test", 0);
			const node2 = LiteralsBuilder.buildStringNode("test", 0);

			expect(node1.id).not.toBe(node2.id);
		});
	});
});
