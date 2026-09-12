import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import { ProjectAnalyserIssueSource } from "@/project-analyser/project.analyser.issue";
import Variable from "@/schemas/variable/variable.schema";
import TimerBlockAnalyser from "./timer-block.analyser";

describe("TimerBlockAnalyser", () => {
	const source: ProjectAnalyserIssueSource = {
		sourceType: "ladder-block",
		sourceId: "b1",
	};

	function variablesMap(...variables: Variable[]): Map<string, Variable> {
		return new Map(variables.map((v) => [v.mnemonic, v]));
	}

	it("signale BLOCK_TIMER_PT_EMPTY quand PT est vide", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_TIMER_PT_EMPTY"]);
	});

	it("accepte une constante T# valide", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_TIMER_PT_INVALID_CONSTANT pour une constante T# mal formée", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#abc" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_TIMER_PT_INVALID_CONSTANT",
		]);
	});

	it("signale BLOCK_TIMER_PT_UNDECLARED_VARIABLE quand PT référence une variable inconnue", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "Inconnue" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_TIMER_PT_UNDECLARED_VARIABLE",
		]);
	});

	it("accepte une variable numérique ou TIME pour PT", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "MaConsigne" },
			0,
			0,
		);
		const consigne = new Variable("v1", "MaConsigne", "memory", "TIME");

		const issues = TimerBlockAnalyser.analyse(
			element,
			source,
			variablesMap(consigne),
		);

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_TIMER_PT_INVALID_TYPE quand PT référence une variable non numérique", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "MaVar" },
			0,
			0,
		);
		const maVar = new Variable("v1", "MaVar", "memory", "BOOL");

		const issues = TimerBlockAnalyser.analyse(
			element,
			source,
			variablesMap(maVar),
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_TIMER_PT_INVALID_TYPE"]);
	});

	it("n'exige rien pour ET quand le pin est vide", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues).toEqual([]);
	});

	it("signale BLOCK_TIMER_ET_UNDECLARED_VARIABLE quand ET référence une variable inconnue", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s", et: "Inconnue" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_TIMER_ET_UNDECLARED_VARIABLE",
		]);
	});

	it("signale BLOCK_TIMER_ET_INVALID_TYPE quand ET référence une variable non numérique", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s", et: "MaVar" },
			0,
			0,
		);
		const maVar = new Variable("v1", "MaVar", "memory", "STRING");

		const issues = TimerBlockAnalyser.analyse(
			element,
			source,
			variablesMap(maVar),
		);

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_TIMER_ET_INVALID_TYPE"]);
	});

	it("n'accepte pas de constante T# pour ET (toujours une variable)", () => {
		const element = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s", et: "T#1s" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual([
			"BLOCK_TIMER_ET_UNDECLARED_VARIABLE",
		]);
	});

	it("signale BLOCK_TIMER_NAME_INVALID quand le nom du bloc est invalide", () => {
		const element = createTimerBlockElement(
			{ name: "1Tempo", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);

		const issues = TimerBlockAnalyser.analyse(element, source, variablesMap());

		expect(issues.map((i) => i.code)).toEqual(["BLOCK_TIMER_NAME_INVALID"]);
	});
});
