import PlcScenario from "@tests/utils/plc-scenario";
import {
	compilePipelineDetailed,
	createPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";
import {
	callProgram,
	no,
	section,
} from "@/templates/training/utils/ladder-dsl";
import {
	COUNTING_PROGRAM_NAME,
	SUBPROGRAMS_PRESET,
	createLadderSubprogramsProject,
	createLadderSubprogramsSolution,
} from "./ladder-subprograms.template";

async function pieces(scenario: PlcScenario, count: number) {
	for (let i = 0; i < count; i++) {
		await scenario.press("capteur_piece", 1);
		scenario.release("capteur_piece");
		await scenario.cycles(1);
	}
}

function conditionalCallProject() {
	const project = createLadderSubprogramsSolution();
	const counting = Object.values(project.ladders).find(
		(ladder) => ladder.name === COUNTING_PROGRAM_NAME,
	)!;
	project.main.sections[1] = section(
		"Appel conditionnel",
		"",
		no("convoyeur"),
		callProgram(counting.id),
	);
	return project;
}

describe("ladder-subprograms.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé : l'analyse avertit que le ladder Comptage n'est pas appelé, mais ne signale aucune erreur", () => {
		const { analysis, compilation } = compilePipelineDetailed(
			createLadderSubprogramsProject(),
		);
		expect(analysis.issues.filter((i) => i.severity === "error")).toHaveLength(
			0,
		);
		expect(
			analysis.issues.filter(
				(i) => i.severity === "warning" && i.code === "LADDER_NOT_REFERENCED",
			),
		).toHaveLength(1);
		expect(compilation.errors).toHaveLength(0);
	});

	it("l'énoncé : le sous-programme non appelé ne compte jamais", async () => {
		const { compilation } = compilePipelineDetailed(
			createLadderSubprogramsProject(),
		);
		const plc = createPLC(compilation.result!);
		plc.start();
		for (let i = 0; i < SUBPROGRAMS_PRESET; i++) {
			plc.setPhysicalInputValueByName("capteur_piece", true);
			await jest.advanceTimersByTimeAsync(200);
			plc.setPhysicalInputValueByName("capteur_piece", false);
			await jest.advanceTimersByTimeAsync(200);
		}
		expect(getVariableValue(plc, "voyant_lot")).toBe(false);
		plc.stop();
	});

	it("le corrigé : le voyant s'allume au troisième passage et raz le fait retomber", async () => {
		const scenario = new PlcScenario(createLadderSubprogramsSolution());
		await scenario.cycles();
		await pieces(scenario, SUBPROGRAMS_PRESET - 1);
		expect(scenario.get("voyant_lot")).toBe(false);
		await pieces(scenario, 1);
		expect(scenario.get("voyant_lot")).toBe(true);
		await scenario.tap("raz", 2);
		expect(scenario.get("voyant_lot")).toBe(false);
		scenario.stop();
	});

	it("le corrigé : le Main commande toujours le convoyeur", async () => {
		const scenario = new PlcScenario(createLadderSubprogramsSolution());
		await scenario.cycles();
		await scenario.tap("marche", 2);
		expect(scenario.get("convoyeur")).toBe(true);
		await scenario.tap("arret", 2);
		expect(scenario.get("convoyeur")).toBe(false);
		scenario.stop();
	});

	it("appel conditionnel : un capteur vrai pendant que le sous-programme ne tourne pas fabrique un front à la reprise", async () => {
		const scenario = new PlcScenario(conditionalCallProject());
		await scenario.cycles();
		scenario.set("capteur_piece", true);
		await scenario.cycles(3);
		expect(scenario.get("cpt.CV")).toBe(0);
		await scenario.tap("marche", 2);
		await scenario.cycles(3);
		expect(scenario.get("cpt.CV")).toBe(1);
		scenario.stop();
	});

	it("appel conditionnel : une pièce passée pendant l'arrêt n'est jamais comptée", async () => {
		const scenario = new PlcScenario(conditionalCallProject());
		await scenario.cycles();
		await scenario.tap("capteur_piece", 2);
		await scenario.cycles(2);
		await scenario.tap("marche", 2);
		await scenario.cycles(3);
		expect(scenario.get("cpt.CV")).toBe(0);
		scenario.stop();
	});
});
