import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import VariableCompiler from "./variable.pre-compiler";

describe("VariableCompiler", () => {
	describe("compile", () => {
		it("compiles a BOOL variable to boolean PLCVariable", () => {
			const variable = new VariableBuilder()
				.id("var-1")
				.mnemonic("M1")
				.type("BOOL")
				.zone("memory")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result).toHaveLength(1);
			expect(result[0].getId()).toBe("var-1");
			expect(result[0].getName()).toBe("M1");
			expect(result[0].getScope()).toBe("memory");
			expect(result[0].getType()).toBe("boolean");
		});

		it("compiles INT, LONG, WORD, DWORD, REAL to number PLCVariable", () => {
			const variables = [
				new VariableBuilder().id("v1").mnemonic("M1").type("INT").zone("memory").build(),
				new VariableBuilder().id("v2").mnemonic("M2").type("LONG").zone("memory").build(),
				new VariableBuilder().id("v3").mnemonic("M3").type("WORD").zone("memory").build(),
				new VariableBuilder().id("v4").mnemonic("M4").type("DWORD").zone("memory").build(),
				new VariableBuilder().id("v5").mnemonic("M5").type("REAL").zone("memory").build(),
			];

			const result = VariableCompiler.compile(variables);

			expect(result).toHaveLength(5);
			result.forEach((plcVar) => {
				expect(plcVar.getType()).toBe("number");
			});
		});

		it("compiles a TIME variable to number PLCVariable", () => {
			const variable = new VariableBuilder().id("var-1").mnemonic("Tempo1ET").type("TIME").zone("memory").build();

			const result = VariableCompiler.compile([variable]);

			expect(result).toHaveLength(1);
			expect(result[0].getType()).toBe("number");
		});

		it("compiles a STRING variable to string PLCVariable", () => {
			const variable = new VariableBuilder()
				.id("var-1")
				.mnemonic("M1")
				.type("STRING")
				.zone("memory")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result).toHaveLength(1);
			expect(result[0].getType()).toBe("string");
		});

		it("maps logic-input zone to input scope", () => {
			const variable = new VariableBuilder()
				.id("v1")
				.mnemonic("E1")
				.type("BOOL")
				.zone("logic-input")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result[0].getScope()).toBe("input");
		});

		it("maps logic-output zone to output scope", () => {
			const variable = new VariableBuilder()
				.id("v1")
				.mnemonic("S1")
				.type("BOOL")
				.zone("logic-output")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result[0].getScope()).toBe("output");
		});

		it("maps analog-input zone to input scope", () => {
			const variable = new VariableBuilder()
				.id("v1")
				.mnemonic("AI1")
				.type("INT")
				.zone("analog-input")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result[0].getScope()).toBe("input");
		});

		it("maps analog-output zone to output scope", () => {
			const variable = new VariableBuilder()
				.id("v1")
				.mnemonic("AO1")
				.type("INT")
				.zone("analog-output")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result[0].getScope()).toBe("output");
		});

		it("maps memory zone to memory scope", () => {
			const variable = new VariableBuilder()
				.id("v1")
				.mnemonic("M1")
				.type("BOOL")
				.zone("memory")
				.build();

			const result = VariableCompiler.compile([variable]);

			expect(result[0].getScope()).toBe("memory");
		});

		it("handles empty array", () => {
			const result = VariableCompiler.compile([]);

			expect(result).toEqual([]);
		});

		it("compiles multiple variables with mixed types", () => {
			const variables = [
				new VariableBuilder().id("v1").mnemonic("M1").type("BOOL").zone("memory").build(),
				new VariableBuilder().id("v2").mnemonic("E1").type("BOOL").zone("logic-input").build(),
				new VariableBuilder().id("v3").mnemonic("M2").type("INT").zone("memory").build(),
				new VariableBuilder().id("v4").mnemonic("M3").type("STRING").zone("memory").build(),
			];

			const result = VariableCompiler.compile(variables);

			expect(result).toHaveLength(4);
			expect(result.map((v) => v.getId())).toEqual(["v1", "v2", "v3", "v4"]);
		});
	});
});
