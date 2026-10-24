import { Dialect } from "@/expression-language/dialect.enum";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import {
	ConvertBlockParams,
	createConvertBlockElement,
} from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import buildAnalysisEnvironment from "@/project-analyser/analysis-environment";
import ConvertBlockAnalyser from "./convert-block.analyser";

describe("ConvertBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};
	const variables = [
		new Variable({
			id: "v1",
			mnemonic: "D",
			zone: "memory",
			type: "DINT",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "v2",
			mnemonic: "I",
			zone: "memory",
			type: "INT",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "v3",
			mnemonic: "R",
			zone: "memory",
			type: "REAL",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "v4",
			mnemonic: "W",
			zone: "memory",
			type: "WORD",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "v5",
			mnemonic: "B",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		}),
		new Variable({
			id: "v6",
			mnemonic: "E",
			zone: "analog-input",
			type: "INT",
			dialect: Dialect.FR,
		}),
	];

	function analyse(params: ConvertBlockParams): string[] {
		return ConvertBlockAnalyser.analyse(
			createConvertBlockElement(0, 0, params),
			source,
			Dialect.FR,
			buildAnalysisEnvironment(variables, Dialect.FR),
		).map((i) => i.code);
	}

	/** Pins named after variables, with the types announced by the block. */
	const block = (
		input: string,
		out: string,
		inType: ConvertBlockParams["inType"],
		outType: ConvertBlockParams["outType"],
	): ConvertBlockParams => ({ in: input, out, inType, outType });

	it("signale les pinoches vides", () => {
		expect(analyse(block("", "", "INT", "REAL"))).toEqual([
			"BLOCK_CONVERT_IN_EMPTY",
			"BLOCK_CONVERT_OUT_EMPTY",
		]);
	});

	it("accepte une conversion prise en charge entre deux variables", () => {
		expect(analyse(block("D", "I", "DINT", "INT"))).toEqual([]);
		expect(analyse(block("I", "R", "INT", "REAL"))).toEqual([]);
		expect(analyse(block("W", "I", "WORD", "INT"))).toEqual([]);
	});

	it("exige des mnémoniques de variable sur IN et OUT", () => {
		expect(analyse(block("D", "42", "DINT", "INT"))).toEqual([
			"BLOCK_CONVERT_OUT_NOT_A_VARIABLE",
		]);
		expect(analyse(block("40000", "I", "DINT", "INT"))).toEqual([
			"BLOCK_CONVERT_IN_NOT_A_VARIABLE",
		]);
	});

	it("signale une variable non déclarée", () => {
		expect(analyse(block("inconnue", "I", "DINT", "INT"))).toEqual([
			"BLOCK_CONVERT_INVALID",
		]);
	});

	it("exige une variable OUT de type convertible", () => {
		expect(analyse(block("D", "B", "DINT", "INT"))).toEqual([
			"BLOCK_CONVERT_OUT_INVALID_TYPE",
		]);
	});

	it("signale une variable IN dont le type diffère de celui annoncé par le bloc", () => {
		expect(analyse(block("I", "R", "DINT", "REAL"))).toEqual([
			"BLOCK_CONVERT_IN_TYPE_MISMATCH",
		]);
	});

	it("signale une variable OUT dont le type diffère de celui annoncé par le bloc", () => {
		expect(analyse(block("D", "I", "DINT", "REAL"))).toEqual([
			"BLOCK_CONVERT_OUT_TYPE_MISMATCH",
		]);
	});

	it("signale les deux écarts de type à la fois, avec les types attendu et réel", () => {
		const issues = ConvertBlockAnalyser.analyse(
			createConvertBlockElement(0, 0, block("I", "R", "DINT", "INT")),
			source,
			Dialect.FR,
			buildAnalysisEnvironment(variables, Dialect.FR),
		);
		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_CONVERT_IN_TYPE_MISMATCH",
			"BLOCK_CONVERT_OUT_TYPE_MISMATCH",
		]);
		expect(issues[0].params).toMatchObject({
			variableName: "I",
			expected: "DINT",
			actual: "INT",
		});
	});

	it("refuse une conversion non prise en charge ou vers le même type", () => {
		expect(analyse(block("R", "W", "REAL", "WORD"))).toEqual([
			"BLOCK_CONVERT_INVALID",
		]);
		expect(analyse(block("E", "I", "INT", "INT"))).toEqual([
			"BLOCK_CONVERT_INVALID",
		]);
	});

	it("refuse d'écrire une entrée", () => {
		expect(analyse(block("D", "E", "DINT", "INT"))).toEqual([
			"BLOCK_CONVERT_INVALID",
		]);
	});
});
