import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import {
	CompareBlockParams,
	createCompareBlockElement,
} from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import CompareBlockAnalyser from "./compare-block.analyser";

describe("CompareBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	function analyse(
		params: CompareBlockParams,
		...variables: Variable[]
	): string[] {
		const element = createCompareBlockElement(0, 0, params);
		return CompareBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(...variables),
		).map((i) => i.code);
	}

	it("signale les deux pinoches vides", () => {
		expect(analyse({ in1: "", in2: "", operator: "=" })).toEqual([
			"BLOCK_COMPARE_IN1_EMPTY",
			"BLOCK_COMPARE_IN2_EMPTY",
		]);
	});

	it("signale BLOCK_COMPARE_OPERATOR_INVALID pour un opérateur hors liste", () => {
		expect(
			analyse({ in1: "A", in2: "B", operator: "<>" as never }),
		).toContain("BLOCK_COMPARE_OPERATOR_INVALID");
	});

	it("accepte une comparaison de variables numériques", () => {
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");
		expect(analyse({ in1: "A", in2: "B", operator: ">" }, a, b)).toEqual([]);
	});

	it("accepte une variable comparée à un littéral numérique", () => {
		const a = new Variable("v1", "A", "memory", "INT");
		expect(analyse({ in1: "A", in2: "5", operator: ">=" }, a)).toEqual([]);
	});

	it("accepte une expression arithmétique sur une pinoche", () => {
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "INT");
		expect(analyse({ in1: "A + 1", in2: "B", operator: ">" }, a, b)).toEqual(
			[],
		);
	});

	it("signale BLOCK_COMPARE_INPUT_NOT_ALLOWED pour une pinoche contenant une comparaison", () => {
		const vars = ["A", "B"].map(
			(name, i) => new Variable(`v${i}`, name, "memory", "INT"),
		);
		expect(
			analyse({ in1: "A > B", in2: "B", operator: "=" }, ...vars),
		).toEqual(["BLOCK_COMPARE_INPUT_NOT_ALLOWED"]);
	});

	it("signale BLOCK_COMPARE_INPUT_NOT_ALLOWED pour une affectation", () => {
		const a = new Variable("v1", "A", "memory", "BOOL");
		const b = new Variable("v2", "B", "memory", "BOOL");
		expect(
			analyse({ in1: "A := B", in2: "B", operator: "=" }, a, b),
		).toEqual(["BLOCK_COMPARE_INPUT_NOT_ALLOWED"]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION quand les deux pinoches n'ont pas le même type", () => {
		const a = new Variable("v1", "A", "memory", "INT");
		const b = new Variable("v2", "B", "memory", "BOOL");
		expect(analyse({ in1: "A", in2: "B", operator: "=" }, a, b)).toEqual([
			"BLOCK_COMPARE_INVALID_EXPRESSION",
		]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION pour un ordre (<) sur des booléens", () => {
		const a = new Variable("v1", "A", "memory", "BOOL");
		const b = new Variable("v2", "B", "memory", "BOOL");
		expect(analyse({ in1: "A", in2: "B", operator: "<" }, a, b)).toEqual([
			"BLOCK_COMPARE_INVALID_EXPRESSION",
		]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION pour une variable inconnue", () => {
		expect(analyse({ in1: "Inconnue", in2: "5", operator: ">" })).toEqual([
			"BLOCK_COMPARE_INVALID_EXPRESSION",
		]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION pour une syntaxe invalide sur une pinoche", () => {
		expect(analyse({ in1: "A +", in2: "B", operator: ">" })).toEqual([
			"BLOCK_COMPARE_INVALID_EXPRESSION",
		]);
	});
});
