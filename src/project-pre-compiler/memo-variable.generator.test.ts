import MemoVariableGenerator from "./memo-variable.generator";

describe("MemoVariableGenerator", () => {
	describe("generate", () => {
		it("generates a memo variable with prefix _GeneratedMemo_0 when no names are taken", () => {
			const takenNames = new Set<string>();
			const variable = MemoVariableGenerator.generate("boolean", takenNames);

			expect(variable.getId()).toBe("_GeneratedMemo_0");
			expect(variable.getName()).toBe("_GeneratedMemo_0");
			expect(variable.getScope()).toBe("memory");
			expect(variable.getType()).toBe("boolean");
		});

		it("generates a memo variable with type number", () => {
			const takenNames = new Set<string>();
			const variable = MemoVariableGenerator.generate("number", takenNames);

			expect(variable.getType()).toBe("number");
		});

		it("generates a memo variable with type string", () => {
			const takenNames = new Set<string>();
			const variable = MemoVariableGenerator.generate("string", takenNames);

			expect(variable.getType()).toBe("string");
		});

		it("skips taken names and generates _GeneratedMemo_1", () => {
			const takenNames = new Set(["_GeneratedMemo_0"]);
			const variable = MemoVariableGenerator.generate("boolean", takenNames);

			expect(variable.getName()).toBe("_GeneratedMemo_1");
		});

		it("skips multiple taken names and finds first available index", () => {
			const takenNames = new Set([
				"_GeneratedMemo_0",
				"_GeneratedMemo_1",
				"_GeneratedMemo_2",
			]);
			const variable = MemoVariableGenerator.generate("boolean", takenNames);

			expect(variable.getName()).toBe("_GeneratedMemo_3");
		});

		it("skips non-sequential taken names correctly", () => {
			const takenNames = new Set(["_GeneratedMemo_0", "_GeneratedMemo_2"]);
			const variable = MemoVariableGenerator.generate("boolean", takenNames);

			expect(variable.getName()).toBe("_GeneratedMemo_1");
		});

		it("handles large counter values", () => {
			const takenNames = new Set<string>();
			for (let i = 0; i < 100; i++) {
				takenNames.add(`_GeneratedMemo_${i}`);
			}
			const variable = MemoVariableGenerator.generate("boolean", takenNames);

			expect(variable.getName()).toBe("_GeneratedMemo_100");
		});

		it("does not mutate the takenNames set", () => {
			const takenNames = new Set(["_GeneratedMemo_0"]);
			const sizeBefore = takenNames.size;

			MemoVariableGenerator.generate("boolean", takenNames);

			expect(takenNames.size).toBe(sizeBefore);
			expect(takenNames.has("_GeneratedMemo_1")).toBe(false);
		});
	});
});
