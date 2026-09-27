import { createUserProgramBlockElement } from "@/schemas/ladder/block.schema";
import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { validateMnemonic } from "@/schemas/variable/variable.validator";
import { createSectionWith, wireInSeries } from "@tests/utils/ladder-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import LadderAnalyser, {
	getBlockPortVariableMnemonic,
	getContactMemoryVariableMnemonic,
	getContactPulseVariableMnemonic,
} from "./ladder.analyser";

describe("LadderAnalyser", () => {
	const ladderAnalyser = new LadderAnalyser();

	/** Reproduit le comportement par défaut d'avant (`project.variables` + les variables générées
	 * par ce seul ladder), désormais explicite puisque `allVariables` est obligatoire. */
	function analyse(ladder: Ladder, project: Project) {
		return ladderAnalyser.analyse(ladder, project, [
			...project.variables,
			...ladderAnalyser.generateVariables(ladder),
		]);
	}

	beforeEach(() => {
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	describe("buildEdgeMemoryVariables (via generateVariables)", () => {
		it("crée deux variables memory/BOOL (mémoire + impulsion) par contact P ou N, aux mnémoniques valides", () => {
			const rail1 = createRailTerminalElement(0);
			const contactP = createContactElement("A", "P", 0, 1);
			const coil1 = createCoilElement("Q1", "normal", 0, 2);
			const rail2 = createRailTerminalElement(1);
			const contactN = createContactElement("B", "N", 1, 1);
			const coil2 = createCoilElement("Q2", "normal", 1, 2);
			const section = createSectionWith(
				[rail1, contactP, coil1, rail2, contactN, coil2],
				[
					...wireInSeries([rail1, contactP, coil1]),
					...wireInSeries([rail2, contactN, coil2]),
				],
			);
			const ladder = new Ladder("l1", "L", [section]);

			const generatedVariables = ladderAnalyser.generateVariables(ladder);

			expect(generatedVariables).toHaveLength(4);
			expect(
				generatedVariables.every(
					(v) => v.zone === "memory" && v.type === "BOOL",
				),
			).toBe(true);
			for (const variable of generatedVariables) {
				expect(validateMnemonic(variable.mnemonic)).toEqual([]);
				expect(variable.mnemonic).not.toContain("-");
			}
			expect(generatedVariables.map((v) => v.mnemonic).sort()).toEqual(
				[
					getContactMemoryVariableMnemonic(contactP.id),
					getContactPulseVariableMnemonic(contactP.id),
					getContactMemoryVariableMnemonic(contactN.id),
					getContactPulseVariableMnemonic(contactN.id),
				].sort(),
			);
		});

		it("crée une seule variable mémoire (la condition précédente) par bobine de front, aucune pour les autres bobines", () => {
			const rail = createRailTerminalElement(0);
			const rising = createCoilElement("Q1", "rising", 0, 1);
			const falling = createCoilElement("Q2", "falling", 0, 1);
			const inverted = createCoilElement("Q3", "inverted", 0, 1);
			const normal = createCoilElement("Q4", "normal", 0, 1);
			const ladder = new Ladder("l1", "L", [
				createSectionWith(
					[rail, rising, falling, inverted, normal],
					[rising, falling, inverted, normal].flatMap((coil) =>
						wireInSeries([rail, coil]),
					),
				),
			]);

			const generatedVariables = ladderAnalyser.generateVariables(ladder);

			expect(generatedVariables.map((v) => v.mnemonic).sort()).toEqual(
				[
					getContactMemoryVariableMnemonic(rising.id),
					getContactMemoryVariableMnemonic(falling.id),
				].sort(),
			);
			expect(
				generatedVariables.every(
					(v) => v.zone === "memory" && v.type === "BOOL",
				),
			).toBe(true);
		});

		it("ne crée aucune variable mémoire pour un contact NO ou NF", () => {
			const rail = createRailTerminalElement(0);
			const contact = createContactElement("A", "NO", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const ladder = new Ladder("l1", "L", [
				createSectionWith(
					[rail, contact, coil],
					wireInSeries([rail, contact, coil]),
				),
			]);

			expect(ladderAnalyser.generateVariables(ladder)).toEqual([]);
		});

		it("rend les variables mémoire de front visibles des analyseurs d'élément (pas de LADDER_CONTACT_VARIABLE_UNDECLARED)", () => {
			const rail = createRailTerminalElement(0);
			const contactP = createContactElement("A", "P", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const ladder = new Ladder("l1", "L", [
				createSectionWith(
					[rail, contactP, coil],
					wireInSeries([rail, contactP, coil]),
				),
			]);
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("A"),
				VariableFactory.createMemoryBool("Q"),
			]);

			const { issues } = analyse(ladder, project);

			expect(issues.map((i) => i.code)).not.toContain(
				"LADDER_CONTACT_VARIABLE_UNDECLARED",
			);
		});
	});

	describe("buildBlockPortVariables (via generateVariables)", () => {
		it("crée deux variables memory/BOOL (EN, ENO) par bloc", () => {
			const rail = createRailTerminalElement(0);
			const block = createUserProgramBlockElement("prog1", 0, 1);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail, block], wireInSeries([rail, block])),
			]);

			const generatedVariables = ladderAnalyser.generateVariables(ladder);

			expect(generatedVariables.map((v) => v.mnemonic).sort()).toEqual(
				[
					getBlockPortVariableMnemonic(block.id, "EN"),
					getBlockPortVariableMnemonic(block.id, "ENO"),
				].sort(),
			);
			expect(
				generatedVariables.every(
					(v) => v.zone === "memory" && v.type === "BOOL",
				),
			).toBe(true);
		});
	});

	describe("buildBlockLastInputVariables (via generateVariables)", () => {
		it("crée une variable memory/BOOL cachée par bloc timer et par bloc compteur", () => {
			const timer = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const counter = createCounterBlockElement(
				{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
				1,
				0,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([timer, counter], []),
			]);

			const generated = ladderAnalyser.generateVariables(ladder);

			for (const block of [timer, counter]) {
				const variable = generated.find(
					(v) =>
						v.mnemonic === getBlockPortVariableMnemonic(block.id, "lastInput"),
				);
				expect(variable?.zone).toBe("memory");
				expect(variable?.type).toBe("BOOL");
			}
		});
	});

	it("crée une seconde variable cachée (front de CD) pour un compteur CTUD, aucune pour un CTU", () => {
		const ctud = createCounterBlockElement(
			{ name: "Stock", counterType: "CTUD", control: "faux", pv: "5" },
			0,
			0,
		);
		const ctu = createCounterBlockElement(
			{ name: "Compteur1", counterType: "CTU", control: "faux", pv: "5" },
			1,
			0,
		);
		const ladder = new Ladder("l1", "L", [createSectionWith([ctud, ctu], [])]);

		const mnemonics = ladderAnalyser
			.generateVariables(ladder)
			.map((v) => v.mnemonic);

		expect(mnemonics).toContain(
			getBlockPortVariableMnemonic(ctud.id, "lastCD"),
		);
		expect(mnemonics).not.toContain(
			getBlockPortVariableMnemonic(ctu.id, "lastCD"),
		);
		expect(mnemonics).toEqual(
			expect.arrayContaining(["Stock.CU", "Stock.QU", "Stock.QD", "Stock.CV"]),
		);
	});

	describe("buildTimerExposedVariables/buildCounterExposedVariables (via generateVariables)", () => {
		it("ignore un bloc tempo dont le nom est invalide, sans lever", () => {
			const rail = createRailTerminalElement(0);
			const block = createTimerBlockElement(
				{ name: "1Tempo", timerType: "TON", pt: "T#5s" },
				0,
				1,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail, block], wireInSeries([rail, block])),
			]);

			expect(() => ladderAnalyser.generateVariables(ladder)).not.toThrow();
			const generatedVariables = ladderAnalyser.generateVariables(ladder);
			expect(
				generatedVariables.some((v) => v.mnemonic.startsWith("1Tempo.")),
			).toBe(false);
		});

		it("ignore un bloc compteur dont le nom est invalide, sans lever", () => {
			const rail = createRailTerminalElement(0);
			const block = createCounterBlockElement(
				{ name: "1Compteur", counterType: "CTU", control: "R", pv: "5" },
				0,
				1,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([rail, block], wireInSeries([rail, block])),
			]);

			expect(() => ladderAnalyser.generateVariables(ladder)).not.toThrow();
			const generatedVariables = ladderAnalyser.generateVariables(ladder);
			expect(
				generatedVariables.some((v) => v.mnemonic.startsWith("1Compteur.")),
			).toBe(false);
		});
	});

	describe("checkConnectionColumnOrder (via analyse)", () => {
		it("ne signale rien quand les connexions vont bien vers une colonne ultérieure ou égale", () => {
			const rail = createRailTerminalElement(0);
			const contact = createContactElement("A", "NO", 0, 1);
			const coil = createCoilElement("Q", "normal", 0, 2);
			const ladder = new Ladder("l1", "L", [
				createSectionWith(
					[rail, contact, coil],
					wireInSeries([rail, contact, coil]),
				),
			]);
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("A"),
				VariableFactory.createMemoryBool("Q"),
			]);

			const { issues } = analyse(ladder, project);

			expect(issues.map((i) => i.code)).not.toContain(
				"LADDER_CONNECTION_INVALID_ORDER",
			);
		});

		it("signale LADDER_CONNECTION_INVALID_ORDER quand une connexion pointe vers une colonne antérieure", () => {
			const rail = createRailTerminalElement(0);
			const contact = createContactElement("A", "NO", 0, 3);
			const coil = createCoilElement("Q", "normal", 0, 1);
			const ladder = new Ladder("l1", "L", [
				createSectionWith(
					[rail, contact, coil],
					wireInSeries([rail, contact, coil]),
				),
			]);
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("A"),
				VariableFactory.createMemoryBool("Q"),
			]);

			const { issues } = analyse(ladder, project);

			expect(issues.map((i) => i.code)).toContain(
				"LADDER_CONNECTION_INVALID_ORDER",
			);
		});
	});

	describe("crossProgramChecks", () => {
		it("agrège les règles cross-ladder : Main dupliqué + nom de bloc dupliqué", () => {
			const project = ProjectFactory.createEmpty();
			// Deux Main → checkMainUniqueness ; deux blocs "T1" → checkBlockNameConflicts.
			project.programs["m2"] = new Ladder("m2", "Main bis", undefined, "main");
			const ladder = new Ladder("l1", "L", [
				createSectionWith(
					[
						createTimerBlockElement(
							{ name: "T1", timerType: "TON", pt: "T#5s" },
							0,
							0,
						),
						createTimerBlockElement(
							{ name: "T1", timerType: "TON", pt: "T#5s" },
							0,
							1,
						),
					],
					[],
				),
			]);
			project.addProgram(ladder);

			const codes = new LadderAnalyser().crossProgramChecks(project).map((i) => i.code);

			expect(codes).toContain("PROJECT_MULTIPLE_MAINS");
			expect(codes).toContain("BLOCK_NAME_DUPLICATE");
		});
	});

	describe("crossProgramChecks with ladders excluded from execution", () => {
		function getMain(project: Project): Ladder {
			return Object.values(project.ladders).find((l) => l.role === "main")!;
		}

		function callFrom(caller: Ladder, calledId: string) {
			caller.addElements(caller.sections[0].id, [
				createUserProgramBlockElement(calledId, 0, 0),
			]);
		}

		it("never reports an excluded ladder as orphan", () => {
			const project = ProjectFactory.createEmpty();
			const excluded = new Ladder("l1", "Illustratif");
			excluded.excludedFromExecution = true;
			project.addProgram(excluded);

			expect(LadderAnalyser.checkOrphanLadders(project)).toEqual([]);
		});

		it("reports as orphan a ladder only called by an excluded ladder", () => {
			const project = ProjectFactory.createEmpty();
			const excluded = new Ladder("l1", "Illustratif");
			excluded.excludedFromExecution = true;
			const called = new Ladder("l2", "Appelé");
			callFrom(excluded, called.id);
			project.addProgram(excluded);
			project.addProgram(called);

			const issues = LadderAnalyser.checkOrphanLadders(project);

			expect(issues.map((i) => [i.code, i.source.sourceId])).toEqual([
				["LADDER_NOT_REFERENCED", "l2"],
			]);
		});

		it("ignores a call cycle going through an excluded ladder", () => {
			const project = ProjectFactory.createEmpty();
			const a = new Ladder("a", "A");
			const b = new Ladder("b", "B");
			b.excludedFromExecution = true;
			callFrom(getMain(project), a.id);
			callFrom(a, b.id);
			callFrom(b, a.id);
			project.addProgram(a);
			project.addProgram(b);

			expect(LadderAnalyser.checkCallCycles(project)).toEqual([]);
		});

		it("ignores block name conflicts with an excluded ladder", () => {
			const project = ProjectFactory.createEmpty();
			const timer = () =>
				createTimerBlockElement({ name: "T1", timerType: "TON", pt: "T#5s" }, 0, 0);
			const executed = new Ladder("l1", "L1", [createSectionWith([timer()], [])]);
			const excluded = new Ladder("l2", "L2", [createSectionWith([timer()], [])]);
			excluded.excludedFromExecution = true;
			project.addProgram(executed);
			project.addProgram(excluded);

			expect(LadderAnalyser.checkBlockNameConflicts(project)).toEqual([]);
		});

		it("does not count an excluded Main as the project Main", () => {
			const project = ProjectFactory.createEmpty();
			getMain(project).excludedFromExecution = true;

			expect(
				LadderAnalyser.checkMainUniqueness(project).map((i) => i.code),
			).toEqual(["PROJECT_MISSING_MAIN"]);
		});
	});

	describe("checkBlockNameConflicts", () => {
		it("ne signale rien quand tous les noms de blocs sont distincts", () => {
			const timer = createTimerBlockElement(
				{ name: "Tempo1", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const counter = createCounterBlockElement(
				{ name: "Compteur1", counterType: "CTU", control: "R", pv: "5" },
				0,
				0,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([timer, counter], []),
			]);
			const project = ProjectFactory.createEmpty();
			project.addProgram(ladder);

			expect(LadderAnalyser.checkBlockNameConflicts(project)).toEqual([]);
		});

		it("signale BLOCK_NAME_DUPLICATE quand deux blocs partagent le même nom", () => {
			const timer1 = createTimerBlockElement(
				{ name: "T1", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const timer2 = createTimerBlockElement(
				{ name: "T1", timerType: "TON", pt: "T#5s" },
				0,
				1,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([timer1, timer2], []),
			]);
			const project = ProjectFactory.createEmpty();
			project.addProgram(ladder);

			const issues = LadderAnalyser.checkBlockNameConflicts(project);

			expect(issues.map((i) => i.code)).toEqual(["BLOCK_NAME_DUPLICATE"]);
		});

		it("signale BLOCK_NAME_DUPLICATE entre un timer et un compteur de même nom", () => {
			const timer = createTimerBlockElement(
				{ name: "X1", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const counter = createCounterBlockElement(
				{ name: "X1", counterType: "CTU", control: "R", pv: "5" },
				0,
				1,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([timer, counter], []),
			]);
			const project = ProjectFactory.createEmpty();
			project.addProgram(ladder);

			const issues = LadderAnalyser.checkBlockNameConflicts(project);

			expect(issues.map((i) => i.code)).toEqual(["BLOCK_NAME_DUPLICATE"]);
		});

		it("signale BLOCK_NAME_VARIABLE_CONFLICT quand un nom de bloc collisionne avec une variable existante", () => {
			const timer = createTimerBlockElement(
				{ name: "A", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const ladder = new Ladder("l1", "L", [createSectionWith([timer], [])]);
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("A"),
			]);
			project.addProgram(ladder);

			const issues = LadderAnalyser.checkBlockNameConflicts(project);

			expect(issues.map((i) => i.code)).toEqual([
				"BLOCK_NAME_VARIABLE_CONFLICT",
			]);
		});

		it("ignore les blocs sans nom (déjà signalés ailleurs)", () => {
			const timer1 = createTimerBlockElement(
				{ name: "", timerType: "TON", pt: "T#5s" },
				0,
				0,
			);
			const timer2 = createTimerBlockElement(
				{ name: "", timerType: "TON", pt: "T#5s" },
				0,
				1,
			);
			const ladder = new Ladder("l1", "L", [
				createSectionWith([timer1, timer2], []),
			]);
			const project = ProjectFactory.createEmpty();
			project.addProgram(ladder);

			expect(LadderAnalyser.checkBlockNameConflicts(project)).toEqual([]);
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
				createSectionWith(
					[rail1, contact, coil1],
					wireInSeries([rail1, contact, coil1]),
				),
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
				createSectionWith(
					[rail, contact, coil],
					wireInSeries([rail, contact, coil]),
				),
			]);
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createMemoryBool("Q1"),
			]);
			const crossProgramVariable = new Variable(
				"v1",
				"Tempo1.Q",
				"memory",
				"BOOL",
				{ id: "block1" },
			);

			const withoutCrossProgramVariable = ladderAnalyser.analyse(
				ladder,
				project,
				[...project.variables],
			);
			expect(withoutCrossProgramVariable.issues.map((i) => i.code)).toContain(
				"LADDER_CONTACT_VARIABLE_UNDECLARED",
			);

			const withCrossProgramVariable = ladderAnalyser.analyse(ladder, project, [
				...project.variables,
				crossProgramVariable,
			]);
			expect(withCrossProgramVariable.issues.map((i) => i.code)).not.toContain(
				"LADDER_CONTACT_VARIABLE_UNDECLARED",
			);
		});
	});
});
