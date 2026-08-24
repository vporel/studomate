import { createUserProgramBlockElement } from "@/schemas/ladder/block.schema";
import { createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Variable from "@/schemas/variable/variable.schema";
import Project from "@/schemas/project/project.schema";
import { createSectionWith, wireInSeries } from "@tests/utils/ladder-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import LadderAnalyser, { getBlockPortVariableMnemonic, getContactMemoryVariableMnemonic } from "./ladder.analyser";

describe("LadderAnalyser", () => {
	const ladderAnalyser = new LadderAnalyser();

	/** Reproduit le comportement par défaut d'avant (`project.variables` + les variables générées
	 * par ce seul ladder), désormais explicite puisque `allVariables` est obligatoire. */
	function analyse(ladder: Ladder, project: Project) {
		return ladderAnalyser.analyse(ladder, project, [...project.variables, ...ladderAnalyser.generateVariables(ladder)]);
	}

	beforeEach(() => {
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	describe("buildEdgeMemoryVariables (via generateVariables)", () => {
		it("crée une variable memory/BOOL par contact P ou N, dont le mnémonique est valide", () => {
			const rail1 = createRailTerminalElement(0);
			const contactP = createContactElement("A", "P", 0, 1);
			const coil1 = createCoilElement("Q1", "normal", 0, 2);
			const rail2 = createRailTerminalElement(1);
			const contactN = createContactElement("B", "N", 1, 1);
			const coil2 = createCoilElement("Q2", "normal", 1, 2);
			const section = createSectionWith(
				[rail1, contactP, coil1, rail2, contactN, coil2],
				[...wireInSeries([rail1, contactP, coil1]), ...wireInSeries([rail2, contactN, coil2])],
			);
			const ladder = new Ladder("l1", "L", [section]);

			const generatedVariables = ladderAnalyser.generateVariables(ladder);

			expect(generatedVariables).toHaveLength(2);
			expect(generatedVariables.every((v) => v.zone === "memory" && v.type === "BOOL")).toBe(true);
			for (const variable of generatedVariables) {
				expect(Variable.validateMnemonic(variable.mnemonic)).toEqual([]);
				expect(variable.mnemonic).not.toContain("-");
			}
			expect(generatedVariables.map((v) => v.mnemonic).sort()).toEqual(
				[getContactMemoryVariableMnemonic(contactP.id), getContactMemoryVariableMnemonic(contactN.id)].sort(),
			);
		});

		it("ne crée aucune variable mémoire pour un contact NO ou NF", () => {
			const rail = createRailTerminalElement(0);
			const contact = createContactElement("A", "NO", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil])),
			]);

			expect(ladderAnalyser.generateVariables(ladder)).toEqual([]);
		});

		it("rend les variables mémoire de front visibles des analyseurs d'élément (pas de CONTACT_VARIABLE_UNDECLARED)", () => {
			const rail = createRailTerminalElement(0);
			const contactP = createContactElement("A", "P", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail, contactP, coil], wireInSeries([rail, contactP, coil])),
			]);
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("A"),
				VariableFactory.createMemoryBool("Q"),
			]);

			const { issues } = analyse(ladder, project);

			expect(issues.map((i) => i.code)).not.toContain("CONTACT_VARIABLE_UNDECLARED");
		});
	});

	describe("buildBlockPortVariables (via generateVariables)", () => {
		it("crée deux variables memory/BOOL (EN, ENO) par bloc", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const ladder = new Ladder("l1", "L", [createSectionWith([rail, block], wireInSeries([rail, block]))]);

			const generatedVariables = ladderAnalyser.generateVariables(ladder);

			expect(generatedVariables.map((v) => v.mnemonic).sort()).toEqual(
				[getBlockPortVariableMnemonic(block.id, "EN"), getBlockPortVariableMnemonic(block.id, "ENO")].sort(),
			);
			expect(generatedVariables.every((v) => v.zone === "memory" && v.type === "BOOL")).toBe(true);
		});
	});

	describe("countLeaves", () => {
		it("compte tous les éléments du ladder, toutes sections confondues", () => {
			const rail1 = createRailTerminalElement(0);
			const contact = createContactElement("A", "NO", 0, 1);
			const coil1 = createCoilElement("Q1", "normal", 0, 2);
			const rail2 = createRailTerminalElement(0);
			const coil2 = createCoilElement("Q2", "normal", 0, 1);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail1, contact, coil1], wireInSeries([rail1, contact, coil1])),
				createSectionWith([rail2, coil2], wireInSeries([rail2, coil2])),
			]);

			expect(ladderAnalyser.countLeaves(ladder)).toBe(5);
		});
	});

	describe("analyse avec allVariables", () => {
		it("résout une référence contre allVariables (variables générées par un AUTRE programme)", () => {
			const rail = createRailTerminalElement(0);
			const contact = createContactElement("Tempo1.Q", "NO", 0, 1);
			const coil = createCoilElement("Q1", "normal", 0, 2);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail, contact, coil], wireInSeries([rail, contact, coil])),
			]);
			const project = ProjectFactory.createWithVariables([VariableFactory.createMemoryBool("Q1")]);
			const crossProgramVariable = new Variable("v1", "Tempo1.Q", "memory", "BOOL", { id: "block1" });

			const withoutCrossProgramVariable = ladderAnalyser.analyse(ladder, project, [...project.variables]);
			expect(withoutCrossProgramVariable.issues.map((i) => i.code)).toContain("CONTACT_VARIABLE_UNDECLARED");

			const withCrossProgramVariable = ladderAnalyser.analyse(ladder, project, [
				...project.variables,
				crossProgramVariable,
			]);
			expect(withCrossProgramVariable.issues.map((i) => i.code)).not.toContain("CONTACT_VARIABLE_UNDECLARED");
		});
	});
});
