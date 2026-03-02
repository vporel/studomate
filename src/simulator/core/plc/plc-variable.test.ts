import PLCVariable from "./plc-variable";

describe("PLCVariable", () => {
	describe("construction", () => {
		it("creates boolean input variable with default false", () => {
			const v = new PLCVariable("id1", "var1", "input", "boolean");
			expect(v.getId()).toBe("id1");
			expect(v.getName()).toBe("var1");
			expect(v.getScope()).toBe("input");
			expect(v.getType()).toBe("boolean");
			expect(v.getValue()).toBe(false);
		});

		it("creates number output variable with default 0", () => {
			const v = new PLCVariable("id2", "var2", "output", "number");
			expect(v.getScope()).toBe("output");
			expect(v.getType()).toBe("number");
			expect(v.getValue()).toBe(0);
		});

		it("creates string memory variable with default empty string", () => {
			const v = new PLCVariable("id3", "var3", "memory", "string");
			expect(v.getScope()).toBe("memory");
			expect(v.getType()).toBe("string");
			expect(v.getValue()).toBe("");
		});

		it("throws on string variable with non-memory scope", () => {
			expect(() => new PLCVariable("id", "v", "input", "string")).toThrow(
				"A string variable is only allowed for the memory scope",
			);
			expect(() => new PLCVariable("id", "v", "output", "string")).toThrow(
				"A string variable is only allowed for the memory scope",
			);
		});
	});

	describe("setValue", () => {
		it("sets boolean value correctly", () => {
			const v = new PLCVariable("id", "flag", "input", "boolean");
			v.setValue(true);
			expect(v.getValue()).toBe(true);
		});

		it("sets number value correctly", () => {
			const v = new PLCVariable("id", "count", "output", "number");
			v.setValue(42);
			expect(v.getValue()).toBe(42);
		});

		it("sets string value correctly", () => {
			const v = new PLCVariable("id", "text", "memory", "string");
			v.setValue("hello");
			expect(v.getValue()).toBe("hello");
		});

		it("throws on type mismatch", () => {
			const v = new PLCVariable("id", "flag", "input", "boolean");
			expect(() => v.setValue(42 as any)).toThrow(
				"The type of the value does not match the variable type",
			);
		});
	});

	describe("copy", () => {
		it("creates a copy with same properties", () => {
			const v1 = new PLCVariable("id1", "var1", "input", "boolean");
			v1.setValue(true);
			const v2 = v1.copy();
			expect(v2.getId()).toBe("id1");
			expect(v2.getName()).toBe("var1");
			expect(v2.getScope()).toBe("input");
			expect(v2.getType()).toBe("boolean");
			expect(v2.getValue()).toBe(true);
		});

		it("creates independent copy", () => {
			const v1 = new PLCVariable("id", "count", "output", "number");
			v1.setValue(10);
			const v2 = v1.copy();
			v2.setValue(20);
			expect(v1.getValue()).toBe(10);
			expect(v2.getValue()).toBe(20);
		});
	});

	describe("scopes", () => {
		it("supports input scope", () => {
			const v = new PLCVariable("id", "in", "input", "boolean");
			expect(v.getScope()).toBe("input");
		});

		it("supports output scope", () => {
			const v = new PLCVariable("id", "out", "output", "number");
			expect(v.getScope()).toBe("output");
		});

		it("supports memory scope", () => {
			const v = new PLCVariable("id", "mem", "memory", "boolean");
			expect(v.getScope()).toBe("memory");
		});
	});

	describe("types", () => {
		it("supports boolean type", () => {
			const v = new PLCVariable("id", "b", "input", "boolean");
			expect(v.getType()).toBe("boolean");
		});

		it("supports number type", () => {
			const v = new PLCVariable("id", "n", "output", "number");
			expect(v.getType()).toBe("number");
		});

		it("supports string type for memory", () => {
			const v = new PLCVariable("id", "s", "memory", "string");
			expect(v.getType()).toBe("string");
		});
	});
});
