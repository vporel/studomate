import { Dialect } from "@/expression-language/dialect.enum";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import Variable from "@/schemas/variable/variable.schema";
import CounterBlockAnalyser from "./counter-block.analyser";

describe("CounterBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale BLOCK_COUNTER_CONTROL_EMPTY quand R/LD est vide", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "", pv: "5" },
			0,
			0,
		);

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(),
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CONTROL_EMPTY"]);
	});

	it("signale BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE quand R/LD référence une variable inconnue", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "Inconnue", pv: "5" },
			0,
			0,
		);

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE",
		]);
	});

	it("signale BLOCK_COUNTER_CONTROL_INVALID_TYPE quand R/LD référence une variable non booléenne", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "MaVar", pv: "5" },
			0,
			0,
		);
		const maVar = new Variable("v1", "MaVar", "memory", "INT");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(maVar),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_CONTROL_INVALID_TYPE",
		]);
	});

	it("accepte une variable booléenne pour R/LD", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "Reset", pv: "5" },
			0,
			0,
		);
		const reset = new Variable("v1", "Reset", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(reset),
		);

		expect(issues).toEqual([]);
	});

	it("accepte un littéral booléen pour R/LD", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "faux", pv: "5" },
			0,
			0,
		);

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(),
		);

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COUNTER_PV_EMPTY quand PV est vide", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r),
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_PV_EMPTY"]);
	});

	it("accepte un littéral numérique pour PV", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "10" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r),
		);

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COUNTER_PV_UNDECLARED_VARIABLE quand PV référence une variable inconnue", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "Inconnue" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_PV_UNDECLARED_VARIABLE",
		]);
	});

	it("signale BLOCK_COUNTER_PV_INVALID_TYPE quand PV référence une variable non numérique", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "MaVar" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const maVar = new Variable("v2", "MaVar", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r, maVar),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_PV_INVALID_TYPE",
		]);
	});

	it("signale BLOCK_COUNTER_PV_INVALID_TYPE quand PV référence une variable TIME (accepté pour un timer, pas un counter)", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "MaConsigne" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const consigne = new Variable("v2", "MaConsigne", "memory", "TIME");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r, consigne),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_PV_INVALID_TYPE",
		]);
	});

	it("n'exige rien pour CV quand le pin est vide", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r),
		);

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COUNTER_CV_UNDECLARED_VARIABLE quand CV référence une variable inconnue", () => {
		const element = createCounterBlockElement(
			{
				name: "Compteur1",
				counterType: "CTU",
				control: "R",
				pv: "5",
				cv: "Inconnue",
			},
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_CV_UNDECLARED_VARIABLE",
		]);
	});

	it("signale BLOCK_COUNTER_CV_INVALID_TYPE quand CV référence une variable non numérique", () => {
		const element = createCounterBlockElement(
			{
				name: "Compteur1",
				counterType: "CTU",
				control: "R",
				pv: "5",
				cv: "MaVar",
			},
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const maVar = new Variable("v2", "MaVar", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r, maVar),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_CV_INVALID_TYPE",
		]);
	});

	it("signale BLOCK_COUNTER_CV_INVALID_TYPE quand CV référence une variable TIME (accepté pour un timer, pas un counter)", () => {
		const element = createCounterBlockElement(
			{
				name: "Compteur1",
				counterType: "CTU",
				control: "R",
				pv: "5",
				cv: "MaConsigne",
			},
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const consigne = new Variable("v2", "MaConsigne", "memory", "TIME");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r, consigne),
		);

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_COUNTER_CV_INVALID_TYPE",
		]);
	});

	it("signale BLOCK_COUNTER_NAME_INVALID quand le nom du bloc est invalide", () => {
		const element = createCounterBlockElement(
			{ name: "1Compteur", counterType: "CTU", control: "R", pv: "5" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(
			element,
			source,
			Dialect.FR,
			variablesMap(r),
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_NAME_INVALID"]);
	});

	describe("CTUD", () => {
		const ctud = (pins: {
			control?: string;
			down?: string;
			load?: string;
			qd?: string;
		}) =>
			createCounterBlockElement(
				{
					name: "Stock",
					counterType: "CTUD",
					control: pins.control ?? "faux",
					pv: "5",
					down: pins.down ?? "faux",
					load: pins.load ?? "faux",
					qd: pins.qd,
				},
				0,
				0,
			);
		const analyse = (element: ReturnType<typeof ctud>, ...vars: Variable[]) =>
			CounterBlockAnalyser.analyse(
				element,
				source,
				Dialect.FR,
				variablesMap(...vars),
			);

		it("n'émet aucune issue quand R, CD et LD sont des littéraux booléens", () => {
			expect(analyse(ctud({}))).toEqual([]);
		});

		it("signale BLOCK_COUNTER_CONTROL_EMPTY avec le nom de la pinoche CD ou LD vide", () => {
			const issues = analyse(ctud({ down: "", load: "" }));

			expect(issues.map((i) => [i.code, i.params.pin])).toEqual([
				["BLOCK_COUNTER_CONTROL_EMPTY", "CD"],
				["BLOCK_COUNTER_CONTROL_EMPTY", "LD"],
			]);
		});

		it("signale une variable CD non déclarée ou non booléenne", () => {
			const issues = analyse(
				ctud({ down: "Inconnue", load: "Nombre" }),
				new Variable("v1", "Nombre", "memory", "INT"),
			);

			expect(issues.map((i) => [i.code, i.params.pin])).toEqual([
				["BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE", "CD"],
				["BLOCK_COUNTER_CONTROL_INVALID_TYPE", "LD"],
			]);
		});

		it("valide QD comme variable booléenne existante quand renseignée", () => {
			expect(
				analyse(ctud({ qd: "Vide" }), new Variable("v1", "Vide", "memory", "BOOL")),
			).toEqual([]);
			expect(analyse(ctud({ qd: "Inconnue" })).map((i) => i.code)).toEqual([
				"BLOCK_COUNTER_QD_UNDECLARED_VARIABLE",
			]);
			expect(
				analyse(ctud({ qd: "Nombre" }), new Variable("v1", "Nombre", "memory", "INT")).map(
					(i) => i.code,
				),
			).toEqual(["BLOCK_COUNTER_QD_INVALID_TYPE"]);
		});

		it("ignore down/load/qd pour un CTU", () => {
			const element = createCounterBlockElement(
				{
					name: "C",
					counterType: "CTU",
					control: "faux",
					pv: "5",
					down: "Inconnue",
				},
				0,
				0,
			);

			expect(analyse(element as never)).toEqual([]);
		});
	});
});
