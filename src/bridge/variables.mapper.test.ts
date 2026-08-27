import VariableBuilder from "@/schemas/variable/builders/variable.builder";
import SchemaVariablesMapper from "./variables.mapper";

describe("SchemaVariablesMapper.schemaToEnv", () => {
	it("carries over id, mnemonic, native type and direction", () => {
		const variable = new VariableBuilder()
			.id("var-1")
			.mnemonic("Counter")
			.zone("memory")
			.type("INT")
			.build();

		const envVar = SchemaVariablesMapper.schemaToEnv(variable);

		expect(envVar.getId()).toBe("var-1");
		expect(envVar.getName()).toBe("Counter");
		expect(envVar.getType()).toBe("number");
		expect(envVar.getDirection()).toBe("INOUT");
	});

	it("maps an input zone to the IN direction", () => {
		const variable = new VariableBuilder()
			.zone("logic-input")
			.type("BOOL")
			.build();
		expect(SchemaVariablesMapper.schemaToEnv(variable).getDirection()).toBe(
			"IN",
		);
	});

	it("maps an output zone to the OUT direction", () => {
		const variable = new VariableBuilder()
			.zone("logic-output")
			.type("BOOL")
			.build();
		expect(SchemaVariablesMapper.schemaToEnv(variable).getDirection()).toBe(
			"OUT",
		);
	});

	it("initialises the environment variable with the type's default value", () => {
		const boolVar = new VariableBuilder().zone("memory").type("BOOL").build();
		expect(SchemaVariablesMapper.schemaToEnv(boolVar).getValue()).toBe(false);

		const intVar = new VariableBuilder().zone("memory").type("INT").build();
		expect(SchemaVariablesMapper.schemaToEnv(intVar).getValue()).toBe(0);

		const stringVar = new VariableBuilder()
			.zone("memory")
			.type("STRING")
			.build();
		expect(SchemaVariablesMapper.schemaToEnv(stringVar).getValue()).toBe("");
	});
});
