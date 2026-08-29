import Connection from "@/schemas/ladder/connection.schema";
import { LadderElement, createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import {
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
} from "@/schemas/ladder/block.schema";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { createTimerBlockElement } from "@/schemas/ladder/function-blocks/timer.schema";
import Section from "@/schemas/ladder/section.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { createRandomId } from "@/ids";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, expectVariableValue, getVariableValue } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";
import { wireLadderIntoMain, wireInSeries } from "@tests/utils/ladder-factory";

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
	});
});
