import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import {
	ArithmeticBlockParams,
	createArithmeticBlockElement,
} from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import ArithmeticBlockAnalyser from "./arithmetic-block.analyser";

describe("ArithmeticBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};

	function analyse(
		params: ArithmeticBlockParams,
		...variables: Variable[]
	): string[] {
		return ArithmeticBlockAnalyser.analyse(
			createArithmeticBlockElement(0, 0, params),
			source,
			Dialect.FR,
			new Map(variables.map((v) => [v.mnemonic, v])),
		).map((i) => i.code);
	}

	const ints = (...names: string[]) =>
		names.map((n, i) => new Variable(`v${i}`, n, "memory", "INT"));

	it("signale les pinoches vides", () => {
		expect(analyse({ in1: "", in2: "", out: "", operator: "+" })).toEqual([
			"BLOCK_ARITHMETIC_IN1_EMPTY",
			"BLOCK_ARITHMETIC_IN2_EMPTY",
			"BLOCK_ARITHMETIC_OUT_EMPTY",
		]);
	});

	it("accepte out := in1 + in2 sur des entiers", () => {
		expect(
			analyse(
				{ in1: "A", in2: "B", out: "C", operator: "+" },
				...ints("A", "B", "C"),
			),
		).toEqual([]);
	});

	it("accepte un littéral numérique en opérande", () => {
		expect(
			analyse({ in1: "A", in2: "10", out: "A", operator: "*" }, ...ints("A")),
		).toEqual([]);
	});

	it("signale BLOCK_ARITHMETIC_INPUT_NOT_ALLOWED pour une expression en opérande", () => {
		expect(
			analyse(
				{ in1: "A + 1", in2: "B", out: "C", operator: "+" },
				...ints("A", "B", "C"),
			),
		).toEqual(["BLOCK_ARITHMETIC_INPUT_NOT_ALLOWED"]);
	});

	it("signale BLOCK_ARITHMETIC_OUT_NOT_A_VARIABLE pour un littéral en cible", () => {
		expect(
			analyse(
				{ in1: "A", in2: "B", out: "3", operator: "+" },
				...ints("A", "B"),
			),
		).toEqual(["BLOCK_ARITHMETIC_OUT_NOT_A_VARIABLE"]);
	});

	it("signale BLOCK_ARITHMETIC_INVALID pour des opérandes non numériques", () => {
		const bools = ["A", "B", "C"].map(
			(n, i) => new Variable(`v${i}`, n, "memory", "BOOL"),
		);
		expect(
			analyse({ in1: "A", in2: "B", out: "C", operator: "+" }, ...bools),
		).toEqual(["BLOCK_ARITHMETIC_INVALID"]);
	});

	it("signale BLOCK_ARITHMETIC_INVALID quand la cible n'existe pas", () => {
		expect(
			analyse(
				{ in1: "A", in2: "B", out: "Inconnue", operator: "+" },
				...ints("A", "B"),
			),
		).toEqual(["BLOCK_ARITHMETIC_INVALID"]);
	});
});
