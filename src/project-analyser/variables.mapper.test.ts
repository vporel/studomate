import { Dialect } from "@/expression-language/dialect.enum";
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

	it("carries over the declared PLC type, used by the typing rules", () => {
		const variable = new VariableBuilder().zone("memory").type("DINT").build();
		expect(SchemaVariablesMapper.schemaToEnv(variable).getDeclaredType()).toBe(
			"DINT",
		);
	});
});

describe("SchemaVariablesMapper.schemaToEnv constants", () => {
	const constant = (
		type: "TIME" | "INT" | "BOOL" | "STRING",
		value: string,
		dialect = Dialect.FR,
	) =>
		new VariableBuilder()
			.id("k")
			.mnemonic("K")
			.zone("constant")
			.type(type)
			.value(value)
			.dialect(dialect)
			.build();

	it("a TIME constant starts at its value in milliseconds", () => {
		const env = SchemaVariablesMapper.schemaToEnv(constant("TIME", "T#5s"));

		expect(env.isConstant()).toBe(true);
		expect(env.getValue()).toBe(5000);
	});

	it("a boolean constant is read with the project dialect", () => {
		const env = SchemaVariablesMapper.schemaToEnv(
			constant("BOOL", "TRUE", Dialect.EN),
			Dialect.EN,
		);

		expect(env.getValue()).toBe(true);
	});

	it("a string constant loses its quotes", () => {
		expect(
			SchemaVariablesMapper.schemaToEnv(constant("STRING", '"abc"')).getValue(),
		).toBe("abc");
	});

	it("an out-of-range value is not coerced: the constant stays at the type zero", () => {
		const invalid = constant("INT", "5");
		invalid.value = "99999";

		expect(SchemaVariablesMapper.schemaToEnv(invalid).getValue()).toBe(0);
	});

	it("an ordinary variable is not constant", () => {
		const memory = new VariableBuilder().id("m").mnemonic("M").build();

		expect(SchemaVariablesMapper.schemaToEnv(memory).isConstant()).toBe(false);
	});
});
