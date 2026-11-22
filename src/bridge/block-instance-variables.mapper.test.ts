import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Project from "@/schemas/project/project.schema";
import { getBlockInstanceVariables } from "./block-instance-variables.mapper";

describe("getBlockInstanceVariables", () => {
	it("expose les variables IN/Q/ET d'un timer, quel que soit le ladder qui le contient", () => {
		const project = new Project("p1", "Projet", "");
		const ladder1 = project.createLadder("L1");
		const ladder2 = project.createLadder("L2");
		const timerBlock = createTimerBlockElement(
			{ name: "t_etoile", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		ladder1.addElements(ladder1.sections[0].id, [timerBlock]);

		const variables = getBlockInstanceVariables(project);

		expect(variables.map((v) => v.mnemonic).sort()).toEqual([
			"t_etoile.ET",
			"t_etoile.IN",
			"t_etoile.Q",
		]);
		// Accessible depuis n'importe quel ladder : la fonction ne dépend pas de `ladder2`, elle
		// parcourt tout le projet (voir `Project.getAllTimerBlockElements`).
		expect(ladder2.getAllElements()).toHaveLength(0);
	});

	it("expose les variables d'un compteur CTUD (CU/QU/QD/CV, pas CD/R/LD qui ne génèrent pas de variable)", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("L1");
		const counterBlock = createCounterBlockElement(
			{ name: "c1", counterType: "CTUD", control: "R1", pv: "10" },
			0,
			0,
		);
		ladder.addElements(ladder.sections[0].id, [counterBlock]);

		const variables = getBlockInstanceVariables(project);

		expect(variables.map((v) => v.mnemonic).sort()).toEqual([
			"c1.CU",
			"c1.CV",
			"c1.QD",
			"c1.QU",
		]);
	});

	it("ignore un bloc dont le nom est invalide (vide)", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("L1");
		const timerBlock = createTimerBlockElement(
			{ name: "", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		ladder.addElements(ladder.sections[0].id, [timerBlock]);

		expect(getBlockInstanceVariables(project)).toEqual([]);
	});

	it("ne renvoie rien pour un projet sans bloc timer/compteur", () => {
		const project = new Project("p1", "Projet", "");
		project.createLadder("L1");

		expect(getBlockInstanceVariables(project)).toEqual([]);
	});
	describe("ladders exclus de l'exécution", () => {
		const timer = (name: string) =>
			createTimerBlockElement({ name, timerType: "TON", pt: "T#5s" }, 0, 0);
		const counter = (name: string) =>
			createCounterBlockElement(
				{ name, counterType: "CTU", control: "R1", pv: "10" },
				0,
				0,
			);

		it("n'expose aucune variable pour un timer d'un ladder exclu", () => {
			const project = new Project("p1", "Projet", "");
			const ladder = project.createLadder("L1");
			ladder.addElements(ladder.sections[0].id, [timer("Tempo1")]);
			ladder.excludedFromExecution = true;

			expect(getBlockInstanceVariables(project)).toEqual([]);
		});

		it("n'expose aucune variable pour un compteur d'un ladder exclu", () => {
			const project = new Project("p1", "Projet", "");
			const ladder = project.createLadder("L1");
			ladder.addElements(ladder.sections[0].id, [counter("Cpt1")]);
			ladder.excludedFromExecution = true;

			expect(getBlockInstanceVariables(project)).toEqual([]);
		});

		it("garde les variables du ladder exécuté quand un autre ladder est exclu", () => {
			const project = new Project("p1", "Projet", "");
			const executed = project.createLadder("L1");
			const excluded = project.createLadder("L2");
			executed.addElements(executed.sections[0].id, [timer("Tempo1")]);
			excluded.addElements(excluded.sections[0].id, [timer("Tempo2")]);
			excluded.excludedFromExecution = true;

			expect(
				getBlockInstanceVariables(project)
					.map((v) => v.mnemonic)
					.sort(),
			).toEqual(["Tempo1.ET", "Tempo1.IN", "Tempo1.Q"]);
		});

		it("expose de nouveau les variables quand le ladder est réintégré à l'exécution", () => {
			const project = new Project("p1", "Projet", "");
			const ladder = project.createLadder("L1");
			ladder.addElements(ladder.sections[0].id, [timer("Tempo1")]);
			ladder.excludedFromExecution = true;
			expect(getBlockInstanceVariables(project)).toEqual([]);

			ladder.excludedFromExecution = false;

			expect(getBlockInstanceVariables(project)).toHaveLength(3);
		});
	});
});
