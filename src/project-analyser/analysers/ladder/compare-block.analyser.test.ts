import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import {
	CompareBlockParams,
	createCompareBlockElement,
} from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import buildAnalysisEnvironment from "@/project-analyser/analysis-environment";
import CompareBlockAnalyser from "./compare-block.analyser";

describe("CompareBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};

	function analyse(
		params: CompareBlockParams,
		...variables: Variable[]
	): string[] {
		const element = createCompareBlockElement(0, 0, params);
		return CompareBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			buildAnalysisEnvironment(variables, Dialect.FR),
		).map((i) => i.code);
	}

	it("signale les deux pinoches vides", () => {
		expect(analyse({ in1: "", in2: "", operator: "=" })).toEqual([
			"BLOCK_COMPARE_IN1_EMPTY",
			"BLOCK_COMPARE_IN2_EMPTY",
		]);
	});

	it("signale BLOCK_COMPARE_OPERATOR_INVALID pour un opérateur hors liste", () => {
		expect(analyse({ in1: "A", in2: "B", operator: "<>" as never })).toContain(
			"BLOCK_COMPARE_OPERATOR_INVALID",
		);
	});

	it("accepte une comparaison de variables numériques", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		const b = new Variable({
			id: "v2",
			mnemonic: "B",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		expect(analyse({ in1: "A", in2: "B", operator: ">" }, a, b)).toEqual([]);
	});

	it("accepte une variable comparée à un littéral numérique", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		expect(analyse({ in1: "A", in2: "5", operator: ">=" }, a)).toEqual([]);
	});

	it("accepte une expression arithmétique sur une pinoche", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		const b = new Variable({
			id: "v2",
			mnemonic: "B",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		expect(analyse({ in1: "A + 1", in2: "B", operator: ">" }, a, b)).toEqual(
			[],
		);
	});

	it("signale BLOCK_COMPARE_INPUT_NOT_ALLOWED pour une pinoche contenant une comparaison", () => {
		const vars = ["A", "B"].map(
			(name, i) =>
				new Variable({
					id: `v${i}`,
					mnemonic: name,
					zone: "memory",
					type: "INT",
					dialect: Dialect.FR,
				}),
		);
		expect(analyse({ in1: "A > B", in2: "B", operator: "=" }, ...vars)).toEqual(
			["BLOCK_COMPARE_INPUT_NOT_ALLOWED"],
		);
	});

	it("signale BLOCK_COMPARE_INPUT_NOT_ALLOWED pour une affectation", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		const b = new Variable({
			id: "v2",
			mnemonic: "B",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		expect(analyse({ in1: "A := B", in2: "B", operator: "=" }, a, b)).toEqual([
			"BLOCK_COMPARE_INPUT_NOT_ALLOWED",
		]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION quand les deux pinoches n'ont pas le même type", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		const b = new Variable({
			id: "v2",
			mnemonic: "B",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		expect(analyse({ in1: "A", in2: "B", operator: "=" }, a, b)).toEqual([
			"BLOCK_COMPARE_INVALID_EXPRESSION",
		]);
	});

	it("signale BLOCK_COMPARE_INVALID_EXPRESSION pour un ordre (<) sur des booléens", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		const b = new Variable({
			id: "v2",
			mnemonic: "B",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
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

	it("compare une durée à une constante T#, refuse une durée comparée à un entier", () => {
		const duree = new Variable({
			id: "v1",
			mnemonic: "duree",
			zone: "memory",
			type: "TIME",
			dialect: Dialect.FR,
		});
		expect(
			analyse({ in1: "duree", in2: "T#2s", operator: ">" }, duree),
		).toEqual([]);
		expect(
			analyse({ in1: "duree", in2: "2000", operator: ">" }, duree),
		).toEqual(["BLOCK_COMPARE_INVALID_EXPRESSION"]);
	});

	it("accepte une conversion de type dans un opérande", () => {
		const d = new Variable({
			id: "v1",
			mnemonic: "D",
			zone: "memory",
			type: "DINT",
			dialect: Dialect.FR,
		});
		const r = new Variable({
			id: "v2",
			mnemonic: "R",
			zone: "memory",
			type: "REAL",
			dialect: Dialect.FR,
		});
		expect(
			analyse({ in1: "DINT_TO_REAL(D)", in2: "R", operator: "<" }, d, r),
		).toEqual([]);
		expect(analyse({ in1: "D", in2: "R", operator: "<" }, d, r)).toEqual([
			"BLOCK_COMPARE_INVALID_EXPRESSION",
		]);
	});
});
