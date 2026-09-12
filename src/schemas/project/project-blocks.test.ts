import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Variable from "@/schemas/variable/variable.schema";
import Project from "./project.schema";

describe("Project — blocs timer", () => {
	it("getAllTimerBlockElements parcourt tous les ladders et ignore les autres types de bloc/élément", () => {
		const project = new Project("p1", "Projet", "");
		const ladder1 = project.createLadder("L1");
		const ladder2 = project.createLadder("L2");
		const timerBlock = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		ladder1.addElements(ladder1.sections[0].id, [timerBlock]);
		ladder2.addElements(ladder2.sections[0].id, [
			{
				id: "b2",
				type: "block",
				data: { blockType: "user-program", params: { programId: "prog1" } },
				position: { row: 0, col: 0 },
			},
		]);

		const found = project.getAllTimerBlockElements();

		expect(found).toHaveLength(1);
		expect(found[0].element.id).toBe(timerBlock.id);
		expect(found[0].ladder.id).toBe(ladder1.id);
	});

	it("isNameTaken détecte une collision avec une variable existante", () => {
		const project = new Project("p1", "Projet", "");
		project.variables.push(new Variable("v1", "Tempo1", "memory", "BOOL"));

		expect(project.isNameTaken("Tempo1")).toBe(true);
		expect(project.isNameTaken("Autre")).toBe(false);
	});

	it("isNameTaken détecte une collision avec un bloc timer existant, tous ladders confondus", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("L1");
		const timerBlock = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		ladder.addElements(ladder.sections[0].id, [timerBlock]);

		expect(project.isNameTaken("Tempo1")).toBe(true);
	});
});
