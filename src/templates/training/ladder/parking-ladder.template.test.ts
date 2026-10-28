import { calledPrograms } from "@tests/utils/execution-sections";
import PlcScenario from "@tests/utils/plc-scenario";
import { CAPACITE } from "@/templates/parking.template";
import {
	createParkingLadderProject,
	createParkingLadderSolution,
} from "./parking-ladder.template";

async function enter(scenario: PlcScenario) {
	await scenario.tap("dem_entree", 1);
	await scenario.cycles(2);
	await scenario.press("passage", 2);
	scenario.release("passage");
	await scenario.cycles(3);
}

describe("parking-ladder.template", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("l'énoncé appelle seulement la signalisation : l'élève crée et appelle Cycle_automatique et Sorties", () => {
		const project = createParkingLadderProject();
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Signalisation",
		]);
	});

	it("le corrigé appelle la signalisation, puis Cycle_automatique et Sorties", () => {
		const project = createParkingLadderSolution();
		expect(calledPrograms(project).map((p) => p.name)).toEqual([
			"Signalisation",
			"Cycle_automatique",
			"Sorties",
		]);
	});

	it("le compteur places est écrit dans Sorties, lu par les transitions de Cycle_automatique", () => {
		const [, cycle, outputs] = calledPrograms(createParkingLadderSolution());
		expect(cycle.sections.map((s) => s.title)).toContain("X0 -> X1");
		expect(outputs.sections).toHaveLength(3);
	});

	it("l'énoncé fournit la signalisation déjà implantée, appelée par le Main", () => {
		const project = createParkingLadderProject();
		expect(project.main.sections).toHaveLength(1);
		expect(
			Object.values(project.programs).some((p) => p.name === "Signalisation"),
		).toBe(true);
	});

	it("une seule unité ajoutée par passage, même passage maintenu plusieurs cycles", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await enter(scenario);
		expect(scenario.get("places")).toBe(1);
		expect(scenario.get("X0")).toBe(true);
		scenario.stop();
	});

	it("une seule unité retirée par sortie, refusée quand le parking est vide", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await scenario.tap("dem_sortie", 1);
		await scenario.cycles(3);
		expect(scenario.get("places")).toBe(0);
		expect(scenario.get("barriere")).toBe(false);

		await enter(scenario);
		await scenario.tap("dem_sortie", 1);
		await scenario.cycles(2);
		await scenario.press("passage", 2);
		scenario.release("passage");
		await scenario.cycles(3);
		expect(scenario.get("places")).toBe(0);
		scenario.stop();
	});

	it("refuse l'entrée quand le parking est complet et allume complet", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		for (let i = 0; i < CAPACITE; i++) await enter(scenario);
		expect(scenario.get("places")).toBe(CAPACITE);
		expect(scenario.get("complet")).toBe(true);
		await scenario.tap("dem_entree", 1);
		await scenario.cycles(3);
		expect(scenario.get("barriere")).toBe(false);
		expect(scenario.get("places")).toBe(CAPACITE);
		scenario.stop();
	});

	it("arret réinitialise la commande sans remettre le compteur de places à zéro", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await enter(scenario);
		await scenario.tap("dem_entree", 1);
		await scenario.cycles(2);
		expect(scenario.get("barriere")).toBe(true);
		await scenario.press("arret", 2);
		expect(scenario.get("barriere")).toBe(false);
		expect(scenario.get("X0")).toBe(true);
		expect(scenario.get("places")).toBe(2);
		scenario.stop();
	});

	describe("barrière maintenue ouverte sous une voiture", () => {
		async function tracePassage(
			request: "dem_entree" | "dem_sortie",
			output: string,
		) {
			const scenario = new PlcScenario(createParkingLadderSolution());
			await scenario.cycles(3);
			if (request === "dem_sortie") await enter(scenario);
			await scenario.tap(request, 1);
			await scenario.cycles(2);
			expect(scenario.get(output)).toBe(true);
			await scenario.press("passage", 1);
			for (let i = 0; i < 3; i++) {
				expect(scenario.get(output)).toBe(true);
				await scenario.cycles(1);
			}
			scenario.release("passage");
			await scenario.cycles(2);
			expect(scenario.get(output)).toBe(false);
			expect(scenario.get("X0")).toBe(true);
			scenario.stop();
		}

		it("en entrée, barriere reste vraie tant que passage est vrai, puis se ferme", async () => {
			await tracePassage("dem_entree", "barriere");
		});

		it("en sortie, barriere reste vraie tant que passage est vrai, puis se ferme", async () => {
			await tracePassage("dem_sortie", "barriere");
		});

		it("un arret pendant un passage ne ferme pas la barrière avant la fin du passage", async () => {
			const scenario = new PlcScenario(createParkingLadderSolution());
			await scenario.cycles(3);
			await scenario.tap("dem_entree", 1);
			await scenario.cycles(2);
			await scenario.press("passage", 2);
			await scenario.press("arret", 2);
			scenario.release("arret");
			await scenario.cycles(2);
			expect(scenario.get("X0")).toBe(true);
			expect(scenario.get("barriere")).toBe(true);
			scenario.release("passage");
			await scenario.cycles(2);
			expect(scenario.get("barriere")).toBe(false);
			scenario.stop();
		});
	});

	it("deux demandes simultanées : seule l'entrée est servie, la demande de sortie est perdue", async () => {
		const scenario = new PlcScenario(createParkingLadderSolution());
		await scenario.cycles(3);
		await enter(scenario);
		expect(scenario.get("places")).toBe(1);

		await scenario.press("dem_entree", 0);
		await scenario.press("dem_sortie", 1);
		scenario.release("dem_entree");
		scenario.release("dem_sortie");
		let exitBranchTaken = false;
		for (let i = 0; i < 2; i++) {
			await scenario.cycles(1);
			exitBranchTaken ||= scenario.get("X3") === true;
		}
		await scenario.press("passage", 2);
		scenario.release("passage");
		await scenario.cycles(3);
		expect(exitBranchTaken).toBe(false);
		expect(scenario.get("places")).toBe(2);
		expect(scenario.get("X0")).toBe(true);
		scenario.stop();
	});
});
