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
});
