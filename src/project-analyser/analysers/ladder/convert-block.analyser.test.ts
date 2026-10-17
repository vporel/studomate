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

	it("signale les pinoches vides", () => {
		expect(analyse({ out: "", in: "" })).toEqual([
			"BLOCK_CONVERT_IN_EMPTY",
			"BLOCK_CONVERT_OUT_EMPTY",
		]);
	});

	it("accepte une conversion prise en charge entre deux variables", () => {
		expect(analyse({ out: "I", in: "D" })).toEqual([]);
		expect(analyse({ out: "R", in: "I" })).toEqual([]);
		expect(analyse({ out: "I", in: "W" })).toEqual([]);
	});

	it("exige des mnémoniques de variable sur IN et OUT", () => {
		expect(analyse({ out: "42", in: "D" })).toEqual([
			"BLOCK_CONVERT_OUT_NOT_A_VARIABLE",
		]);
		expect(analyse({ out: "I", in: "40000" })).toEqual([
			"BLOCK_CONVERT_IN_NOT_A_VARIABLE",
		]);
	});

	it("signale une variable non déclarée", () => {
		expect(analyse({ out: "I", in: "inconnue" })).toEqual([
			"BLOCK_CONVERT_INVALID",
		]);
	});

	it("exige une variable OUT de type convertible", () => {
		expect(analyse({ out: "B", in: "D" })).toEqual([
			"BLOCK_CONVERT_OUT_INVALID_TYPE",
		]);
	});

	it("refuse une conversion non prise en charge ou vers le même type", () => {
		expect(analyse({ out: "W", in: "R" })).toEqual(["BLOCK_CONVERT_INVALID"]);
		expect(analyse({ out: "I", in: "E" })).toEqual(["BLOCK_CONVERT_INVALID"]);
	});

	it("refuse d'écrire une entrée", () => {
		expect(analyse({ out: "E", in: "D" })).toEqual(["BLOCK_CONVERT_INVALID"]);
	});
});
