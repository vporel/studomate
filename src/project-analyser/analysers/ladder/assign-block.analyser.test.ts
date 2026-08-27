import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import {
	AssignBlockParams,
	createAssignBlockElement,
} from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
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
			new Map(variables.map((v) => [v.mnemonic, v])),
		).map((i) => i.code);
	}

	it("signale les pinoches vides", () => {
		expect(analyse({ out: "", in: "" })).toEqual([
			"BLOCK_ASSIGN_IN_EMPTY",
			"BLOCK_ASSIGN_OUT_EMPTY",
		]);
	});

	it("accepte une affectation de variable à variable de même type", () => {
		const a = new Variable("v1", "A", "memory", "BOOL");
		const b = new Variable("v2", "B", "memory", "BOOL");
		expect(analyse({ out: "A", in: "B" }, a, b)).toEqual([]);
	});

	it("accepte un littéral en source", () => {
		const a = new Variable("v1", "A", "memory", "INT");
		expect(analyse({ out: "A", in: "42" }, a)).toEqual([]);
	});

	it("signale BLOCK_ASSIGN_IN_NOT_ALLOWED pour une expression en source", () => {
		const vars = ["A", "B"].map(
			(n, i) => new Variable(`v${i}`, n, "memory", "INT"),
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
		const a = new Variable("v1", "A", "logic-input", "BOOL");
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
		const a = new Variable("v1", "A", "memory", "BOOL");
		const b = new Variable("v2", "B", "memory", "INT");
		expect(analyse({ out: "A", in: "B" }, a, b)).toEqual([
			"BLOCK_ASSIGN_INVALID",
		]);
	});
});
