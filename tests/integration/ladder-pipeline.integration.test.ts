import Connection from "@/schemas/ladder/connection.schema";
import { LadderElement, createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
} from "@/schemas/ladder/block.schema";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Section from "@/schemas/ladder/section.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { createRandomId } from "@/ids";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, expectVariableValue, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";
import { wireLadderIntoMain, wireInSeries, wireInParallel } from "@tests/utils/ladder-factory";

/** Pose une borne d'alimentation, un contact et une bobine reliés en série, dans la section donnée. */
function wireContactToCoil(ladder: Ladder, section: Section, contactParams: Parameters<typeof createContactElement>, coilParams: Parameters<typeof createCoilElement>) {
	const railTerminal = createRailTerminalElement(contactParams[2]);
	const contact = createContactElement(...contactParams);
	const coil = createCoilElement(...coilParams);
	ladder.addElements(section.id, [railTerminal, contact, coil]);
	ladder.addConnections(section.id, [
		new Connection(createRandomId(), { id: railTerminal.id, type: "contact", handle: "source" }, { id: contact.id, type: "coil", handle: "target" }),
		new Connection(createRandomId(), { id: contact.id, type: "contact", handle: "source" }, { id: coil.id, type: "coil", handle: "target" }),
	]);
}

/** Câble une ligne d'éléments en série (rail → … → dernier) dans la section donnée. */
function wireSeries(ladder: Ladder, section: Section, elements: LadderElement[]) {
	ladder.addElements(section.id, elements);
	ladder.addConnections(section.id, wireInSeries(elements));
}

describe("Ladder Pipeline Integration Test", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	describe("Complete workflow: Analysis → Pre-compilation → Compilation → Simulation", () => {
		it("compiles and simulates a single contact driving a coil", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const outputVar = VariableFactory.createLogicOutput("Q0");

			const project = ProjectFactory.createWithVariables([inputVar, outputVar]);
			const ladder = project.createLadder("Ladder 1");
			wireLadderIntoMain(project, ladder);
			const [section] = ladder.sections;
			wireContactToCoil(ladder, section, ["I0", "NO", 0, 0], ["Q0", "normal", 0, 1]);

			const pipeline = compilePipelineDetailed(project);
			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
			// Un seul routine de premier niveau : le Main (qui appelle "Ladder 1" via un bloc).
			expect(pipeline.compilation.result!.routines).toHaveLength(1);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, undefined, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			expectVariableValue(plc!, "Q0", false);

			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(100);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			plc!.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(100);
			plc!.stop();
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", false); // bobine normale : suit la condition à chaque cycle
		});

		it("latches a set/reset coil pair across separate networks", async () => {
			const setInput = VariableFactory.createLogicInput("I0");
			const resetInput = VariableFactory.createLogicInput("I1");
			const outputVar = VariableFactory.createLogicOutput("Q0");

			const project = ProjectFactory.createWithVariables([setInput, resetInput, outputVar]);
			const ladder = project.createLadder("Ladder 1");
			wireLadderIntoMain(project, ladder);
			const [sectionA] = ladder.sections;
			const sectionB = ladder.createSection("Section B");
			wireContactToCoil(ladder, sectionA, ["I0", "NO", 0, 0], ["Q0", "set", 0, 1]);
			wireContactToCoil(ladder, sectionB, ["I1", "NO", 0, 0], ["Q0", "reset", 0, 1]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, undefined, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			// Impulsion sur I0 : Q0 se verrouille à vrai
			plc!.setPhysicalInputValueByName("I0", true);
			plc!.start();
			await jest.advanceTimersByTimeAsync(100);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			// I0 repasse à faux : Q0 reste verrouillé (bobine set, pas normale)
			plc!.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(100);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			// Impulsion sur I1 : Q0 se déverrouille
			plc!.setPhysicalInputValueByName("I1", true);
			await jest.advanceTimersByTimeAsync(100);
			plc!.stop();
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", false);
		});

		it("detects a rising edge (contact P) for a single scan", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const outputVar = VariableFactory.createLogicOutput("Q0");

			const project = ProjectFactory.createWithVariables([inputVar, outputVar]);
			const ladder = project.createLadder("Ladder 1");
			wireLadderIntoMain(project, ladder);
			const [section] = ladder.sections;
			wireContactToCoil(ladder, section, ["I0", "P", 0, 0], ["Q0", "normal", 0, 1]);

			const pipeline = compilePipelineDetailed(project);
			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, undefined, {
				onCycleError: (e) => {
					cycleError = e;
				},
			});
			expect(plc).not.toBeNull();

			plc!.start();
			plc!.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(15); // le temps d'un seul cycle : le front est détecté
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			// I0 reste à vrai, mais ce n'est plus un front : Q0 doit retomber
			await jest.advanceTimersByTimeAsync(100);
			plc!.stop();
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", false);
		});

		it("detects a falling edge (contact N) for a single scan", async () => {
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			const ladder = project.createLadder("Ladder 1");
			wireLadderIntoMain(project, ladder);
			wireContactToCoil(ladder, ladder.sections[0], ["I0", "N", 0, 0], ["Q0", "normal", 0, 1]);

			const pipeline = compilePipelineDetailed(project);
			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, undefined, { onCycleError: (e) => { cycleError = e; } })!;

			plc.start();
			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(50);
			if (cycleError) throw cycleError;
			expectVariableValue(plc, "Q0", false); // niveau haut : pas de front descendant

			plc.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(15); // un seul cycle : le front descendant est détecté
			if (cycleError) throw cycleError;
			expectVariableValue(plc, "Q0", true);

			await jest.advanceTimersByTimeAsync(100); // I0 reste bas : ce n'est plus un front
			plc.stop();
			if (cycleError) throw cycleError;
			expectVariableValue(plc, "Q0", false);
		});
	});

	describe("Blocs fonction : pipeline complet + simulation", () => {
		function newLadderProject(vars: Parameters<typeof ProjectFactory.createWithVariables>[0]) {
			const project = ProjectFactory.createWithVariables(vars);
			const ladder = project.createLadder("Ladder 1");
			wireLadderIntoMain(project, ladder);
			return { project, ladder, section: ladder.sections[0] };
		}

		function runPlc(project: Parameters<typeof compileToPLC>[0]) {
			const pipeline = compilePipelineDetailed(project);
			expect(pipeline.analysis.issues.filter((i) => i.severity === "error")).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);

			let cycleError: Error | null = null;
			const plc = compileToPLC(project, 10, undefined, { onCycleError: (e) => (cycleError = e) });
			expect(plc).not.toBeNull();
			return { plc: plc!, throwOnCycleError: () => { if (cycleError) throw cycleError; } };
		}

		it("timer TON : Q passe à vrai après l'écoulement de PT, retombe quand IN repasse à faux", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createContactElement("I0", "NO", 0, 1),
				createTimerBlockElement({ name: "Tempo1", timerType: "TON", pt: "T#1s" }, 0, 2),
				createCoilElement("Q0", "normal", 0, 3),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();
			plc.setPhysicalInputValueByName("I0", true);

			await jest.advanceTimersByTimeAsync(500);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", false); // PT pas encore écoulé

			await jest.advanceTimersByTimeAsync(700);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true);

			plc.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(100);
			plc.stop();
			throwOnCycleError();
			expectVariableValue(plc, "Q0", false);
		});

		it("compteur CTU : CV monte tant que CU est vrai, Q à PV, R remet à zéro", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicInput("RST"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createContactElement("I0", "NO", 0, 1),
				createCounterBlockElement({ name: "Compteur1", counterType: "CTU", control: "RST", pv: "3" }, 0, 2),
				createCoilElement("Q0", "normal", 0, 3),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			// CU compté en niveau (voir counter-node.evaluator) : CV croît de 1 par cycle tant que I0 est vrai.
			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(200);
			plc.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(30);
			throwOnCycleError();
			expect(getVariableValue(plc, "Compteur1.CV")).toBeGreaterThanOrEqual(3);
			expectVariableValue(plc, "Q0", true);

			plc.setPhysicalInputValueByName("RST", true);
			await jest.advanceTimersByTimeAsync(30);
			plc.stop();
			throwOnCycleError();
			expect(getVariableValue(plc, "Compteur1.CV")).toBe(0);
			expectVariableValue(plc, "Q0", false);
		});

		it("bloc compare : Q suit le résultat de l'expression booléenne", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createAnalogInput("Niveau"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createCompareBlockElement(0, 1, {
					in1: "Niveau",
					in2: "10",
					operator: ">=",
				}),
				createCoilElement("Q0", "normal", 0, 2),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			plc.setPhysicalInputValueByName("Niveau", 5);
			await jest.advanceTimersByTimeAsync(30);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", false);

			plc.setPhysicalInputValueByName("Niveau", 12);
			await jest.advanceTimersByTimeAsync(30);
			plc.stop();
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true);
		});

		it("blocs assign + arithmetic : écrivent tant que EN est vrai", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createAnalogInput("Niveau"),
				VariableFactory.createMemoryInt("Copie"),
				VariableFactory.createMemoryInt("Sortie"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createContactElement("I0", "NO", 0, 1),
				createAssignBlockElement(0, 2, { out: "Copie", in: "Niveau" }),
				createArithmeticBlockElement(0, 4, {
					in1: "Copie",
					in2: "1",
					out: "Sortie",
					operator: "+",
				}),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			plc.setPhysicalInputValueByName("Niveau", 4);
			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(30);
			throwOnCycleError();
			expect(getVariableValue(plc, "Sortie")).toBe(5);

			plc.setPhysicalInputValueByName("I0", false);
			plc.setPhysicalInputValueByName("Niveau", 99);
			await jest.advanceTimersByTimeAsync(30);
			plc.stop();
			throwOnCycleError();
			expect(getVariableValue(plc, "Sortie")).toBe(5); // EN faux : plus d'écriture
		});

		it("timer TOF : Q reste vrai pendant PT après la retombée de IN", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createContactElement("I0", "NO", 0, 1),
				createTimerBlockElement({ name: "Tof1", timerType: "TOF", pt: "T#1s" }, 0, 2),
				createCoilElement("Q0", "normal", 0, 3),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(50);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true); // suit IN à la montée

			plc.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(500);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true); // PT pas encore écoulé depuis la retombée

			await jest.advanceTimersByTimeAsync(700);
			plc.stop();
			throwOnCycleError();
			expectVariableValue(plc, "Q0", false);
		});

		it("timer TP : impulsion de durée PT même si IN reste vrai", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createContactElement("I0", "NO", 0, 1),
				createTimerBlockElement({ name: "Tp1", timerType: "TP", pt: "T#1s" }, 0, 2),
				createCoilElement("Q0", "normal", 0, 3),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(300);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true); // impulsion en cours

			await jest.advanceTimersByTimeAsync(900);
			plc.stop();
			throwOnCycleError();
			// PT écoulé : l'impulsion retombe alors que I0 est toujours vrai (ce qui distingue TP de TON).
			expectVariableValue(plc, "Q0", false);
		});

		it("compteur CTD : LD recharge CV à PV, CD décompte, Q suit CV ≥ PV", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("CD"),
				VariableFactory.createLogicInput("LD"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			wireSeries(ladder, section, [
				createRailTerminalElement(0),
				createContactElement("CD", "NO", 0, 1),
				createCounterBlockElement({ name: "Down1", counterType: "CTD", control: "LD", pv: "3" }, 0, 2),
				createCoilElement("Q0", "normal", 0, 3),
			]);

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			// LD en niveau : CV figé à PV, Q vrai (CV ≥ PV).
			plc.setPhysicalInputValueByName("LD", true);
			await jest.advanceTimersByTimeAsync(30);
			throwOnCycleError();
			expect(getVariableValue(plc, "Down1.CV")).toBe(3);
			expectVariableValue(plc, "Q0", true);

			// LD relâché, CD en niveau : CV décroît d'une unité par cycle, Q retombe sous PV.
			plc.setPhysicalInputValueByName("LD", false);
			plc.setPhysicalInputValueByName("CD", true);
			await jest.advanceTimersByTimeAsync(200);
			plc.setPhysicalInputValueByName("CD", false);
			await jest.advanceTimersByTimeAsync(30);
			plc.stop();
			throwOnCycleError();
			expect(getVariableValue(plc, "Down1.CV") as number).toBeLessThan(3);
			expectVariableValue(plc, "Q0", false);
		});

		it("appel `user-program` gardé : le sous-programme ne s'exécute que si EN est vrai", async () => {
			const project = ProjectFactory.createWithVariables([
				VariableFactory.createLogicInput("enable"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			const sub = project.createLadder("Sous-programme");
			wireSeries(sub, sub.sections[0], [
				createRailTerminalElement(0),
				createCoilElement("Q0", "set", 0, 1),
			]);

			// Main : rail → contact `enable` → bloc appelant le sous-programme.
			const [mainSection] = project.main.sections;
			const rail = createRailTerminalElement(0);
			const enableContact = createContactElement("enable", "NO", 0, 1);
			const callBlock = createUserProgramBlockElement(sub.id, 0, 2);
			project.main.addElements(mainSection.id, [rail, enableContact, callBlock]);
			project.main.addConnections(mainSection.id, wireInSeries([rail, enableContact, callBlock]));

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			await jest.advanceTimersByTimeAsync(50);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", false); // EN faux : le sous-programme n'a pas tourné

			plc.setPhysicalInputValueByName("enable", true);
			await jest.advanceTimersByTimeAsync(50);
			plc.stop();
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true); // EN vrai : le SET du sous-programme a été exécuté
		});

		it("rung à branches parallèles (OU) : la bobine suit le OU des deux contacts", async () => {
			const { project, ladder, section } = newLadderProject([
				VariableFactory.createLogicInput("I0"),
				VariableFactory.createLogicInput("I1"),
				VariableFactory.createLogicOutput("Q0"),
			]);
			const rail = createRailTerminalElement(0);
			const contactA = createContactElement("I0", "NO", 0, 1);
			const contactB = createContactElement("I1", "NO", 1, 1);
			const coil = createCoilElement("Q0", "normal", 0, 2);
			ladder.addElements(section.id, [rail, contactA, contactB, coil]);
			ladder.addConnections(section.id, wireInParallel(rail, [contactA, contactB], coil));

			const { plc, throwOnCycleError } = runPlc(project);
			plc.start();

			await jest.advanceTimersByTimeAsync(30);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", false);

			plc.setPhysicalInputValueByName("I1", true);
			await jest.advanceTimersByTimeAsync(30);
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true); // une seule branche suffit

			plc.setPhysicalInputValueByName("I1", false);
			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(30);
			plc.stop();
			throwOnCycleError();
			expectVariableValue(plc, "Q0", true);
		});

		it("l'ordre des sections est l'ordre d'exécution : la dernière section gagne", async () => {
			// Deux sections toujours passantes (contact NF sur une variable restée fausse) qui
			// pilotent `Q` en sens opposés : à chaque balayage, celle exécutée en dernier l'emporte.
			const build = (order: "set-then-reset" | "reset-then-set") => {
				const project = ProjectFactory.createWithVariables([
					VariableFactory.createMemoryBool("x"),
					VariableFactory.createMemoryBool("Q"),
				]);
				const ladder = project.createLadder("Ladder 1");
				wireLadderIntoMain(project, ladder);
				const setSection = ladder.sections[0];
				wireSeries(ladder, setSection, [
					createRailTerminalElement(0),
					createContactElement("x", "NF", 0, 1),
					createCoilElement("Q", "normal", 0, 2),
				]);
				const resetSection = ladder.createSection("Reset");
				wireSeries(ladder, resetSection, [
					createRailTerminalElement(0),
					createContactElement("x", "NF", 0, 1),
					createCoilElement("Q", "reset", 0, 2),
				]);
				if (order === "reset-then-set") {
					ladder.reorderSections([resetSection.id, setSection.id]);
				}
				return runPlc(project);
			};

			const setLast = build("reset-then-set");
			setLast.plc.start();
			await jest.advanceTimersByTimeAsync(100);
			setLast.plc.stop();
			setLast.throwOnCycleError();
			expectVariableValue(setLast.plc, "Q", true);

			const resetLast = build("set-then-reset");
			resetLast.plc.start();
			await jest.advanceTimersByTimeAsync(100);
			resetLast.plc.stop();
			resetLast.throwOnCycleError();
			expectVariableValue(resetLast.plc, "Q", false);
		});
	});
});
