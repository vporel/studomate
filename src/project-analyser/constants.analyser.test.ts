import { Dialect } from "@/expression-language/dialect.enum";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import Variable from "@/schemas/variable/variable.schema";
import analyseConstants from "./constants.analyser";

function projectWith(variables: Variable[], dialect = Dialect.FR) {
	const project = new ProjectBuilder().id("p1").name("P").author("A").build();
	project.dialect = dialect;
	project.variables = variables;
	return project;
}

const constant = (
	mnemonic: string,
	type: Variable["type"],
	value: string,
	dialect = Dialect.FR,
) =>
	new Variable({
		id: mnemonic,
		mnemonic,
		zone: "constant",
		type,
		value,
		dialect,
	});

describe("analyseConstants", () => {
	it("reports nothing for valid constants", () => {
		const project = projectWith([
			constant("K1", "INT", "42"),
			constant("B1", "BOOL", "VRAI"),
		]);

		expect(analyseConstants(project)).toEqual([]);
	});

	it("reports a constant carrying an address", () => {
		const k = constant("K1", "INT", "42");
		k.address = "%MW0";

		const issues = analyseConstants(projectWith([k]));

		expect(issues).toHaveLength(1);
		expect(issues[0].code).toBe("PROJECT_CONSTANT_INVALID");
		expect(issues[0].severity).toBe("error");
		expect(issues[0].params).toEqual({ variableName: "K1" });
	});

	it("accepts the boolean keyword of the project dialect only", () => {
		const trueEn = constant("B1", "BOOL", "TRUE", Dialect.EN);

		expect(analyseConstants(projectWith([trueEn], Dialect.EN))).toEqual([]);
		const issues = analyseConstants(projectWith([trueEn], Dialect.FR));
		expect(issues.map((i) => i.params)).toEqual([{ variableName: "B1" }]);

		const vraiFr = constant("B2", "BOOL", "VRAI", Dialect.FR);
		expect(analyseConstants(projectWith([vraiFr], Dialect.FR))).toEqual([]);
		expect(analyseConstants(projectWith([vraiFr], Dialect.EN))).toHaveLength(1);
	});

	it("reports a constant whose literal is invalid or missing", () => {
		const bad = constant("K1", "INT", "42");
		bad.value = "abc";
		const missing = constant("K2", "INT", "1");
		missing.value = undefined;

		const issues = analyseConstants(projectWith([bad, missing]));

		expect(issues.map((i) => i.params)).toEqual([
			{ variableName: "K1" },
			{ variableName: "K2" },
		]);
	});

	it("ignores a non-constant variable with an invalid declaration", () => {
		const memory = new Variable({
			id: "m",
			mnemonic: "M",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		memory.address = "garbage";
		memory.mnemonic = "1bad";

		expect(analyseConstants(projectWith([memory]))).toEqual([]);
	});
});
