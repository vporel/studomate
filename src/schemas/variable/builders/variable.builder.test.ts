import Variable from "../variable.schema";
import VariableBuilder from "./variable.builder";

describe("VariableBuilder", () => {
	it("builds a variable with default values", () => {
		const variable = new VariableBuilder().id("var-1").build();

		expect(variable).toBeInstanceOf(Variable);
		expect(variable.id).toBe("var-1");
		expect(variable.mnemonic).toBe("var");
		expect(variable.zone).toBe("memory");
		expect(variable.type).toBe("BOOL");
	});

	it("builds a variable with custom mnemonic", () => {
		const variable = new VariableBuilder().id("var-1").mnemonic("myVar").build();

		expect(variable.mnemonic).toBe("myVar");
	});

	it("builds a variable with custom zone", () => {
		const variable = new VariableBuilder().id("var-1").mnemonic("input1").zone("logic-input").build();

		expect(variable.zone).toBe("logic-input");
	});

	it("builds a variable with custom type", () => {
		const variable = new VariableBuilder().id("var-1").mnemonic("counter").type("INT").build();

		expect(variable.type).toBe("INT");
	});

	it("builds a variable with address", () => {
		const variable = new VariableBuilder().id("var-1").mnemonic("sensor1").address("%I0.0").build();

		expect(variable.address).toBe("%I0.0");
	});

	it("builds a variable with comment", () => {
		const variable = new VariableBuilder()
			.id("var-1")
			.mnemonic("motor")
			.comment("Main motor control")
			.build();

		expect(variable.comment).toBe("Main motor control");
	});

	it("builds a complete variable with all properties", () => {
		const variable = new VariableBuilder()
			.id("var-1")
			.mnemonic("temperature")
			.zone("analog-input")
			.type("INT")
			.address("%IW0")
			.comment("Temperature sensor reading")
			.build();

		expect(variable.id).toBe("var-1");
		expect(variable.mnemonic).toBe("temperature");
		expect(variable.zone).toBe("analog-input");
		expect(variable.type).toBe("INT");
		expect(variable.address).toBe("%IW0");
		expect(variable.comment).toBe("Temperature sensor reading");
	});

	it("allows method chaining", () => {
		const builder = new VariableBuilder();
		const result = builder.id("var-1");

		expect(result).toBe(builder);
	});

	it("builds multiple variables independently", () => {
		const var1 = new VariableBuilder().id("var-1").mnemonic("var1").build();
		const var2 = new VariableBuilder().id("var-2").mnemonic("var2").build();

		expect(var1.id).toBe("var-1");
		expect(var1.mnemonic).toBe("var1");
		expect(var2.id).toBe("var-2");
		expect(var2.mnemonic).toBe("var2");
	});

	it("validates variable on build", () => {
		expect(() => {
			new VariableBuilder().id("var-1").mnemonic("").build();
		}).toThrow();
	});

	describe("Static factory methods", () => {
		it("creates a logic input variable", () => {
			const variable = VariableBuilder.buildLogicInput("var-1", "I0");

			expect(variable).toBeInstanceOf(Variable);
			expect(variable.id).toBe("var-1");
			expect(variable.mnemonic).toBe("I0");
			expect(variable.zone).toBe("logic-input");
			expect(variable.type).toBe("BOOL");
		});

		it("creates a logic output variable", () => {
			const variable = VariableBuilder.buildLogicOutput("var-2", "Q0");

			expect(variable).toBeInstanceOf(Variable);
			expect(variable.id).toBe("var-2");
			expect(variable.mnemonic).toBe("Q0");
			expect(variable.zone).toBe("logic-output");
			expect(variable.type).toBe("BOOL");
		});

		it("creates a memory boolean variable", () => {
			const variable = VariableBuilder.buildMemoryBool("var-3", "M0");

			expect(variable).toBeInstanceOf(Variable);
			expect(variable.id).toBe("var-3");
			expect(variable.mnemonic).toBe("M0");
			expect(variable.zone).toBe("memory");
			expect(variable.type).toBe("BOOL");
		});

		it("creates a memory integer variable", () => {
			const variable = VariableBuilder.buildMemoryInt("var-4", "Counter");

			expect(variable).toBeInstanceOf(Variable);
			expect(variable.id).toBe("var-4");
			expect(variable.mnemonic).toBe("Counter");
			expect(variable.zone).toBe("memory");
			expect(variable.type).toBe("INT");
		});

		it("creates an analog input variable", () => {
			const variable = VariableBuilder.buildAnalogInput("var-5", "AI0");

			expect(variable).toBeInstanceOf(Variable);
			expect(variable.id).toBe("var-5");
			expect(variable.mnemonic).toBe("AI0");
			expect(variable.zone).toBe("analog-input");
			expect(variable.type).toBe("INT");
		});

		it("creates an analog output variable", () => {
			const variable = VariableBuilder.buildAnalogOutput("var-6", "AO0");

			expect(variable).toBeInstanceOf(Variable);
			expect(variable.id).toBe("var-6");
			expect(variable.mnemonic).toBe("AO0");
			expect(variable.zone).toBe("analog-output");
			expect(variable.type).toBe("INT");
		});
	});
});
