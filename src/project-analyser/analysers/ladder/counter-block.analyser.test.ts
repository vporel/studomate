import { createCounterBlockElement } from "@/schemas/function-blocks/counter.schema";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import Variable from "@/schemas/variable/variable.schema";
import CounterBlockAnalyser from "./counter-block.analyser";

describe("CounterBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = { sourceType: "ladder-block", sourceId: "b1" };

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale BLOCK_COUNTER_CONTROL_EMPTY quand R/LD est vide", () => {
		const element = createCounterBlockElement({ name: "Compteur1", counterType: "CTU", control: "", pv: "5" }, 0, 0);

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CONTROL_EMPTY"]);
	});

	it("signale BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE quand R/LD référence une variable inconnue", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "Inconnue", pv: "5" },
			0,
			0,
		);

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CONTROL_UNDECLARED_VARIABLE"]);
	});

	it("signale BLOCK_COUNTER_CONTROL_INVALID_TYPE quand R/LD référence une variable non booléenne", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "MaVar", pv: "5" },
			0,
			0,
		);
		const maVar = new Variable("v1", "MaVar", "memory", "INT");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(maVar));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CONTROL_INVALID_TYPE"]);
	});

	it("accepte une variable booléenne pour R/LD", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "Reset", pv: "5" },
			0,
			0,
		);
		const reset = new Variable("v1", "Reset", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(reset));

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COUNTER_PV_EMPTY quand PV est vide", () => {
		const element = createCounterBlockElement({ name: "Compteur1", counterType: "CTU", control: "R", pv: "" }, 0, 0);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_PV_EMPTY"]);
	});

	it("accepte un littéral numérique pour PV", () => {
		const element = createCounterBlockElement({ name: "Compteur1", counterType: "CTU", control: "R", pv: "10" }, 0, 0);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r));

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COUNTER_PV_UNDECLARED_VARIABLE quand PV référence une variable inconnue", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "Inconnue" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_PV_UNDECLARED_VARIABLE"]);
	});

	it("signale BLOCK_COUNTER_PV_INVALID_TYPE quand PV référence une variable non numérique", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "MaVar" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const maVar = new Variable("v2", "MaVar", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r, maVar));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_PV_INVALID_TYPE"]);
	});

	it("signale BLOCK_COUNTER_PV_INVALID_TYPE quand PV référence une variable TIME (accepté pour un timer, pas un counter)", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "MaConsigne" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const consigne = new Variable("v2", "MaConsigne", "memory", "TIME");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r, consigne));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_PV_INVALID_TYPE"]);
	});

	it("n'exige rien pour CV quand le pin est vide", () => {
		const element = createCounterBlockElement({ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" }, 0, 0);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r));

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_COUNTER_CV_UNDECLARED_VARIABLE quand CV référence une variable inconnue", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5", cv: "Inconnue" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CV_UNDECLARED_VARIABLE"]);
	});

	it("signale BLOCK_COUNTER_CV_INVALID_TYPE quand CV référence une variable non numérique", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5", cv: "MaVar" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const maVar = new Variable("v2", "MaVar", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r, maVar));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CV_INVALID_TYPE"]);
	});

	it("signale BLOCK_COUNTER_CV_INVALID_TYPE quand CV référence une variable TIME (accepté pour un timer, pas un counter)", () => {
		const element = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5", cv: "MaConsigne" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");
		const consigne = new Variable("v2", "MaConsigne", "memory", "TIME");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r, consigne));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_CV_INVALID_TYPE"]);
	});

	it("signale BLOCK_COUNTER_NAME_INVALID quand le nom du bloc est invalide", () => {
		const element = createCounterBlockElement(
			{ name: "1Compteur", counterType: "CTU", control: "R", pv: "5" },
			0,
			0,
		);
		const r = new Variable("v1", "R", "memory", "BOOL");

		const issues = CounterBlockAnalyser.analyse(element, source, variablesMap(r));

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_COUNTER_NAME_INVALID"]);
	});
});
