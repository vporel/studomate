import { Dialect } from "@/expression-language/dialect.enum";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
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
		project.variables.push(
			new Variable({
				id: "v1",
				mnemonic: "Tempo1",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);

		expect(project.isNameTaken("Tempo1")).toBe(true);
		expect(project.isNameTaken("Autre")).toBe(false);
	});

	it("findVariableByMnemonic résout un mnémonique exact et ignore la casse différente et les variables système", () => {
		const project = new Project("p1", "Projet", "");
		const variable = new Variable({
			id: "v1",
			mnemonic: "Tempo1",
			zone: "memory",
			type: "BOOL",
			dialect: Dialect.FR,
		});
		project.variables.push(variable);

		expect(project.findVariableByMnemonic("Tempo1")).toBe(variable);
		expect(project.findVariableByMnemonic("tempo1")).toBeUndefined();
		expect(project.findVariableByMnemonic("Autre")).toBeUndefined();
		expect(project.findVariableByMnemonic("_SYS_TB_1s")).toBeUndefined();
	});

	it("getExecutedPrograms, getExecutedLadders et getExecutedGrafcets écartent les programmes exclus de l'exécution", () => {
		const project = new Project("p1", "Projet", "");
		const main = project.main;
		const ladder = project.createLadder("L");
		const excludedLadder = project.createLadder("LX");
		excludedLadder.excludedFromExecution = true;
		const grafcet = project.createGrafcet("G");
		const excludedGrafcet = project.createGrafcet("GX");
		excludedGrafcet.excludedFromExecution = true;

		expect(project.getExecutedPrograms().map((p) => p.id)).toEqual([
			main.id,
			ladder.id,
			grafcet.id,
		]);
		expect(project.getExecutedLadders().map((l) => l.id)).toEqual([
			main.id,
			ladder.id,
		]);
		expect(project.getExecutedGrafcets().map((g) => g.id)).toEqual([
			grafcet.id,
		]);
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

	it("isBlockNameTaken détecte un bloc timer ou compteur, pas une variable ni un nom libre", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("L1");
		ladder.addElements(ladder.sections[0].id, [
			createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
				0,
				0,
			),
			createCounterBlockElement(
				{ name: "Cpt1", counterType: "CTUD", control: "R1", pv: "10" },
				1,
				0,
			),
		]);
		project.variables.push(
			new Variable({
				id: "v1",
				mnemonic: "Moteur",
				zone: "memory",
				type: "BOOL",
				dialect: Dialect.FR,
			}),
		);

		expect(project.isBlockNameTaken("Tempo1")).toBe(true);
		expect(project.isBlockNameTaken("Cpt1")).toBe(true);
		expect(project.isBlockNameTaken("Libre")).toBe(false);
		expect(project.isBlockNameTaken("Moteur")).toBe(false);
		expect(project.isNameTaken("Cpt1")).toBe(true);
		expect(project.isNameTaken("Moteur")).toBe(true);
	});
});
