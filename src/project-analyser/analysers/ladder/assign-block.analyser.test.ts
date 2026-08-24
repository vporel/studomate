import { createAssignBlockElement } from "@/schemas/ladder/block.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import Variable from "@/schemas/variable/variable.schema";
import AssignBlockAnalyser from "./assign-block.analyser";

describe("AssignBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = { sourceType: "ladder-block", sourceId: "b1" };

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale BLOCK_ASSIGN_EXPRESSION_EMPTY quand l'expression est vide", () => {
		const element = createAssignBlockElement({ expression: "" }, 0, 0);

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_ASSIGN_EXPRESSION_EMPTY"]);
	});

	it("accepte une affectation simple", () => {
		const element = createAssignBlockElement({ expression: "A := B" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "BOOL");
		const b = new Variable("v2", "B", "memory", "BOOL");

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues).toEqual([]);
	});

	it("accepte une affectation dont le résultat est numérique (n'importe quel type)", () => {
		const element = createAssignBlockElement({ expression: "A := B + 1" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues).toEqual([]);
	});

	it("accepte une affectation dont la valeur est une expression logique", () => {
		const element = createAssignBlockElement({ expression: "A := B ET C" }, 0, 0);
		const vars = ["A", "B", "C"].map((name, i) => new Variable(`v${i}`, name, "memory", "BOOL"));

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(...vars));

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_ASSIGN_NOT_AN_ASSIGNMENT quand l'expression n'est pas une affectation", () => {
		const element = createAssignBlockElement({ expression: "A > B" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_ASSIGN_NOT_AN_ASSIGNMENT"]);
	});

	it("signale BLOCK_ASSIGN_MULTIPLE_ASSIGNMENTS pour une affectation imbriquée dans une autre", () => {
		const element = createAssignBlockElement({ expression: "A := (B := C)" }, 0, 0);
		const vars = ["A", "B", "C"].map((name, i) => new Variable(`v${i}`, name, "memory", "BOOL"));

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(...vars));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_ASSIGN_MULTIPLE_ASSIGNMENTS"]);
	});

	it("signale BLOCK_ASSIGN_INVALID_EXPRESSION pour une erreur de syntaxe", () => {
		const element = createAssignBlockElement({ expression: "A :=" }, 0, 0);

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_ASSIGN_INVALID_EXPRESSION"]);
	});

	it("signale BLOCK_ASSIGN_INVALID_EXPRESSION pour une variable inconnue", () => {
		const element = createAssignBlockElement({ expression: "Inconnue := 5" }, 0, 0);

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_ASSIGN_INVALID_EXPRESSION"]);
	});

	it("signale BLOCK_ASSIGN_INVALID_EXPRESSION quand la variable cible est une entrée", () => {
		const element = createAssignBlockElement({ expression: "A := true" }, 0, 0);
		const a = new Variable("v1", "A", "logic-input", "BOOL");

		const issues = AssignBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_ASSIGN_INVALID_EXPRESSION"]);
	});
});
