import { Dialect } from "@/expression-language/dialect.enum";
import ProjectBuilder from "@/schemas/project/builders/project.builder";
import { PUSH_BUTTON_NO_BEHAVIOR } from "@/schemas/variable/input-behavior";
import Variable from "@/schemas/variable/variable.schema";
import analyseVariables from "./variables.analyser";

function projectWith(variables: Variable[]) {
	const project = new ProjectBuilder().id("p1").name("P").author("A").build();
	project.dialect = Dialect.FR;
	project.variables = variables;
	return project;
}

const memory = (
	mnemonic: string,
	id = mnemonic,
	type: Variable["type"] = "BOOL",
) => new Variable({ id, mnemonic, zone: "memory", type, dialect: Dialect.FR });

/** A variable the way an import builds it: fields assigned without going through the constructor. */
const tampered = (changes: Partial<Variable>) =>
	Object.assign(memory("Ok"), changes) as Variable;

const codesOf = (variables: Variable[]) =>
	analyseVariables(projectWith(variables)).map((i) => i.cause ?? i.code);

describe("analyseVariables", () => {
	it("reports nothing for valid variables", () => {
		expect(
			analyseVariables(
				projectWith([memory("A"), memory("B", "b", "INT"), memory("C_1")]),
			),
		).toEqual([]);
		expect(analyseVariables(projectWith([]))).toEqual([]);
	});

	describe("invalid variable", () => {
		const reasonOf = (changes: Partial<Variable>) => {
			const issues = analyseVariables(projectWith([tampered(changes)]));
			return issues.map((i) => (i.cause as { code: string }).code);
		};

		it.each([
			["an empty mnemonic", { mnemonic: "" }, "MNEMONIC_EMPTY"],
			[
				"a mnemonic that is too long",
				{ mnemonic: "A".repeat(40) },
				"MNEMONIC_TOO_LONG",
			],
			[
				"a mnemonic starting with a digit",
				{ mnemonic: "1abc" },
				"MNEMONIC_MUST_START_WITH_LETTER",
			],
			[
				"a mnemonic with a space",
				{ mnemonic: "my var" },
				"MNEMONIC_INVALID_CHARS",
			],
			[
				"the reserved system prefix",
				{ mnemonic: "_SYS_X" },
				"RESERVED_SYSTEM_PREFIX",
			],
			["an unknown type", { type: "FOO" as never }, "ZONE_TYPE_INCOMPATIBLE"],
			[
				"a type the zone does not allow",
				{ zone: "input", type: "STRING" as never },
				"ZONE_TYPE_INCOMPATIBLE",
			],
			[
				"an unknown zone",
				{ zone: "output" as never },
				"ZONE_TYPE_INCOMPATIBLE",
			],
			["an address without %", { address: "I0.0" }, "ADDRESS_MISSING_PERCENT"],
			["a malformed address", { address: "%ZZ9" }, "ADDRESS_INVALID"],
			[
				"a behavior the variable cannot have",
				{ behavior: PUSH_BUTTON_NO_BEHAVIOR },
				"BEHAVIOR_NOT_ALLOWED",
			],
		])("reports %s", (_label, changes, expectedReason) => {
			expect(reasonOf(changes as Partial<Variable>)).toContain(expectedReason);
		});

		it("is an error on the project, naming the variable and carrying the reason", () => {
			const [issue] = analyseVariables(
				projectWith([tampered({ mnemonic: "my var" })]),
			);

			expect(issue.severity).toBe("error");
			expect(issue.code).toBe("PROJECT_VARIABLE_INVALID");
			expect(issue.source).toEqual({ sourceType: "project", sourceId: "p1" });
			expect(issue.params).toEqual({ variableName: "my var" });
			expect(issue.cause).toEqual({
				code: "MNEMONIC_INVALID_CHARS",
				params: undefined,
			});
		});

		it("reports one issue per reason of the same variable", () => {
			const issues = analyseVariables(
				projectWith([tampered({ mnemonic: "1 bad", address: "%ZZ9" })]),
			);

			const reasons = issues.map((i) => (i.cause as { code: string }).code);
			expect(reasons).toEqual(
				expect.arrayContaining([
					"MNEMONIC_MUST_START_WITH_LETTER",
					"MNEMONIC_INVALID_CHARS",
					"ADDRESS_INVALID",
				]),
			);
			expect(issues.every((i) => i.params.variableName === "1 bad")).toBe(true);
		});

		it("leaves an invalid constant to analyseConstants", () => {
			const constant = new Variable({
				id: "k",
				mnemonic: "K",
				zone: "constant",
				type: "INT",
				value: "42",
				dialect: Dialect.FR,
			});
			constant.address = "%MW0";

			expect(analyseVariables(projectWith([constant]))).toEqual([]);
		});
	});

	describe("duplicated mnemonic", () => {
		it("reports a mnemonic declared twice with the same type", () => {
			const issues = analyseVariables(
				projectWith([memory("M", "a"), memory("M", "b")]),
			);

			expect(issues).toHaveLength(1);
			expect(issues[0].severity).toBe("error");
			expect(issues[0].code).toBe("PROJECT_VARIABLE_MNEMONIC_DUPLICATE");
			expect(issues[0].source).toEqual({
				sourceType: "project",
				sourceId: "p1",
			});
			expect(issues[0].params).toEqual({ variableName: "M", count: 2 });
		});

		it("reports a mnemonic declared with different types", () => {
			const issues = analyseVariables(
				projectWith([memory("M", "a", "BOOL"), memory("M", "b", "INT")]),
			);

			expect(issues.map((i) => i.code)).toEqual([
				"PROJECT_VARIABLE_MNEMONIC_DUPLICATE",
			]);
		});

		it("reports a single issue for three declarations", () => {
			const issues = analyseVariables(
				projectWith([memory("M", "a"), memory("M", "b"), memory("M", "c")]),
			);

			expect(issues).toHaveLength(1);
			expect(issues[0].params.count).toBe(3);
		});

		it("reports each duplicated mnemonic once", () => {
			const issues = analyseVariables(
				projectWith([
					memory("M", "a"),
					memory("N", "b"),
					memory("M", "c"),
					memory("N", "d"),
					memory("P", "e"),
				]),
			);

			expect(issues.map((i) => i.params.variableName).sort()).toEqual([
				"M",
				"N",
			]);
		});

		it("includes constants", () => {
			const constant = new Variable({
				id: "k",
				mnemonic: "M",
				zone: "constant",
				type: "INT",
				value: "1",
				dialect: Dialect.FR,
			});

			expect(codesOf([memory("M"), constant])).toEqual([
				"PROJECT_VARIABLE_MNEMONIC_DUPLICATE",
			]);
		});

		it("compares mnemonics exactly", () => {
			expect(codesOf([memory("M"), memory("m")])).toEqual([]);
		});
	});
});
