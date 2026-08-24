import { createCompareBlockElement } from "@/schemas/ladder/block.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import Variable from "@/schemas/variable/variable.schema";
import CompareBlockAnalyser from "./compare-block.analyser";

describe("CompareBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = { sourceType: "ladder-block", sourceId: "b1" };

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale BLOCK_COMPARE_EXPRESSION_EMPTY quand l'expression est vide", () => {
		const element = createCompareBlockElement({ expression: "" }, 0, 0);

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_EXPRESSION_EMPTY"]);
	});

	it("accepte une comparaison de variables numériques", () => {
		const element = createCompareBlockElement({ expression: "A > B" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues).toEqual([]);
	});

	it("accepte une expression arithmétique combinée à une comparaison", () => {
		const element = createCompareBlockElement({ expression: "A + 1 > B" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COMPARE_ASSIGNMENT_NOT_ALLOWED quand l'expression est une affectation", () => {
		const element = createCompareBlockElement({ expression: "A := B" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "BOOL");
		const b = new Variable("v2", "B", "memory", "BOOL");

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_ASSIGNMENT_NOT_ALLOWED"]);
	});

	it("signale BLOCK_COMPARE_OPERATOR_NOT_ALLOWED pour un opérateur logique (ET/OU)", () => {
		const element = createCompareBlockElement({ expression: "A > B ET C > D" }, 0, 0);
		const vars = ["A", "B", "C", "D"].map((name, i) => new Variable(`v${i}`, name, "memory", "INT"));

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(...vars));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_OPERATOR_NOT_ALLOWED"]);
	});

	it("signale BLOCK_COMPARE_OPERATOR_NOT_ALLOWED pour un NON (opérateur unaire)", () => {
		const element = createCompareBlockElement({ expression: "NON A" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "BOOL");

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_OPERATOR_NOT_ALLOWED"]);
	});

	it("signale BLOCK_COMPARE_EXPRESSION_NOT_BOOLEAN quand l'expression n'est pas booléenne", () => {
		const element = createCompareBlockElement({ expression: "A + B" }, 0, 0);
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap(a, b));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_EXPRESSION_NOT_BOOLEAN"]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION pour une erreur de syntaxe", () => {
		const element = createCompareBlockElement({ expression: "A >" }, 0, 0);

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_INVALID_EXPRESSION"]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION pour une variable inconnue", () => {
		const element = createCompareBlockElement({ expression: "Inconnue > 5" }, 0, 0);

		const issues = CompareBlockAnalyser.analyse(element, source, Dialect.FR, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COMPARE_INVALID_EXPRESSION"]);
	});
});
