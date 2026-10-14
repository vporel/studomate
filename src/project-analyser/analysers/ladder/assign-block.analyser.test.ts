import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import {
	AssignBlockParams,
	createAssignBlockElement,
} from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import buildAnalysisEnvironment from "@/project-analyser/analysis-environment";
import AssignBlockAnalyser from "./assign-block.analyser";

describe("AssignBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};

	function analyse(
		params: AssignBlockParams,
		...variables: Variable[]
	): string[] {
		return AssignBlockAnalyser.analyse(
			createAssignBlockElement(0, 0, params),
			source,
			Dialect.FR,
			buildAnalysisEnvironment(variables, Dialect.FR),
		).map((i) => i.code);
	}

	it("signale les pinoches vides", () => {
		expect(analyse({ out: "", in: "" })).toEqual([
			"BLOCK_ASSIGN_IN_EMPTY",
			"BLOCK_ASSIGN_OUT_EMPTY",
		]);
	});

	it("accepte une affectation de variable à variable de même type", () => {
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
		expect(analyse({ out: "A", in: "B" }, a, b)).toEqual([]);
	});

	it("accepte un littéral en source", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		expect(analyse({ out: "A", in: "42" }, a)).toEqual([]);
	});

	it("signale BLOCK_ASSIGN_IN_NOT_ALLOWED pour une expression en source", () => {
		const vars = ["A", "B"].map(
			(n, i) =>
				new Variable({
					id: `v${i}`,
					mnemonic: n,
					zone: "memory",
					type: "INT",
					dialect: Dialect.FR,
				}),
		);
		expect(analyse({ out: "A", in: "B + 1" }, ...vars)).toEqual([
			"BLOCK_ASSIGN_IN_NOT_ALLOWED",
		]);
	});

	it("signale BLOCK_ASSIGN_OUT_NOT_A_VARIABLE pour un littéral en cible", () => {
		expect(analyse({ out: "42", in: "1" })).toEqual([
			"BLOCK_ASSIGN_OUT_NOT_A_VARIABLE",
		]);
	});

	it("signale BLOCK_ASSIGN_INVALID quand la cible est une entrée", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "logic-input",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		expect(analyse({ out: "A", in: "vrai" }, a)).toEqual([
			"BLOCK_ASSIGN_INVALID",
		]);
	});

	it("signale BLOCK_ASSIGN_INVALID quand la cible n'existe pas", () => {
		expect(analyse({ out: "Inconnue", in: "5" })).toEqual([
			"BLOCK_ASSIGN_INVALID",
		]);
	});

	it("signale BLOCK_ASSIGN_INVALID pour une incompatibilité de type", () => {
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
			type: "INT",
			dialect: Dialect.FR,
		});
		expect(analyse({ out: "A", in: "B" }, a, b)).toEqual([
			"BLOCK_ASSIGN_INVALID",
		]);
	});

	it("signale BLOCK_ASSIGN_INVALID quand la cible est une constante", () => {
		const k = new Variable({
			id: "v1",
			mnemonic: "K",
			zone: "constant",
			type: "INT",
			value: "5",
			dialect: Dialect.FR,
		});
		expect(analyse({ out: "K", in: "1" }, k)).toEqual(["BLOCK_ASSIGN_INVALID"]);
	});

	it("accepte une constante en source", () => {
		const a = new Variable({
			id: "v1",
			mnemonic: "A",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		});
		const k = new Variable({
			id: "v2",
			mnemonic: "K",
			zone: "constant",
			type: "INT",
			value: "5",
			dialect: Dialect.FR,
		});
		expect(analyse({ out: "A", in: "K" }, a, k)).toEqual([]);
	});
});
