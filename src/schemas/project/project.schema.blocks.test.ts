import { Dialect } from "@/expression-language/dialect.enum";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Variable from "@/schemas/variable/variable.schema";
import Project from "./project.schema";

describe("Project — noms et blocs", () => {
	it("isMnemonicTaken détecte une collision avec une variable existante", () => {
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

		expect(project.isMnemonicTaken("Tempo1")).toBe(true);
		expect(project.isMnemonicTaken("Autre")).toBe(false);
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

	it("isMnemonicTaken détecte une collision avec un bloc timer existant, tous ladders confondus", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("L1");
		const timerBlock = createTimerBlockElement(
			{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
			0,
			0,
		);
		ladder.addElements(ladder.sections[0].id, [timerBlock]);

		expect(project.isMnemonicTaken("Tempo1")).toBe(true);
	});

	it("isMnemonicClaimedByAnyProgram détecte un bloc timer ou compteur, pas une variable ni un nom libre", () => {
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

		expect(project.isMnemonicClaimedByAnyProgram("Tempo1")).toBe(true);
		expect(project.isMnemonicClaimedByAnyProgram("Cpt1")).toBe(true);
		expect(project.isMnemonicClaimedByAnyProgram("Libre")).toBe(false);
		expect(project.isMnemonicClaimedByAnyProgram("Moteur")).toBe(false);
		expect(project.isMnemonicTaken("Cpt1")).toBe(true);
		expect(project.isMnemonicTaken("Moteur")).toBe(true);
	});

	it("isMnemonicClaimedByAnyProgram compte aussi les ladders exclus de l'exécution", () => {
		const project = new Project("p1", "Projet", "");
		const ladder = project.createLadder("L1");
		ladder.excludedFromExecution = true;
		ladder.addElements(ladder.sections[0].id, [
			createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
				0,
				0,
			),
		]);

		expect(project.isMnemonicClaimedByAnyProgram("Tempo1")).toBe(true);
	});
});
