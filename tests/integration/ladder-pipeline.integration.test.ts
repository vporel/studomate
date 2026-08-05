import Connection from "@/schemas/ladder/connection.schema";
import { createContactElement, createCoilElement, createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { createRandomId } from "@/schemas/utils/ids";
import { ProjectFactory } from "@tests/utils/project-factory";
import { compilePipelineDetailed, compileToPLC, expectVariableValue, wait } from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

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

describe("Ladder Pipeline Integration Test", () => {
	beforeEach(() => {
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	describe("Complete workflow: Analysis → Pre-compilation → Compilation → Simulation", () => {
		it("compiles and simulates a single contact driving a coil", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const outputVar = VariableFactory.createLogicOutput("Q0");

			const project = ProjectFactory.createWithVariables([inputVar, outputVar]);
			const ladder = project.createLadder("Ladder 1");
			const [section] = ladder.sections;
			wireContactToCoil(ladder, section, ["I0", "NO", 0, 0], ["Q0", "normal", 0, 1]);

			const pipeline = compilePipelineDetailed(project);
			expect(pipeline.analysis.issues).toEqual([]);
			expect(pipeline.preCompilation.errors).toEqual([]);
			expect(pipeline.compilation.errors).toEqual([]);
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
			await wait(100);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			plc!.setPhysicalInputValueByName("I0", false);
			await wait(100);
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
			await wait(100);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			// I0 repasse à faux : Q0 reste verrouillé (bobine set, pas normale)
			plc!.setPhysicalInputValueByName("I0", false);
			await wait(100);
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			// Impulsion sur I1 : Q0 se déverrouille
			plc!.setPhysicalInputValueByName("I1", true);
			await wait(100);
			plc!.stop();
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", false);
		});

		it("detects a rising edge (contact P) for a single scan", async () => {
			const inputVar = VariableFactory.createLogicInput("I0");
			const outputVar = VariableFactory.createLogicOutput("Q0");

			const project = ProjectFactory.createWithVariables([inputVar, outputVar]);
			const ladder = project.createLadder("Ladder 1");
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
			await wait(15); // le temps d'un seul cycle : le front est détecté
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", true);

			// I0 reste à vrai, mais ce n'est plus un front : Q0 doit retomber
			await wait(100);
			plc!.stop();
			if (cycleError) throw cycleError;
			expectVariableValue(plc!, "Q0", false);
		});
	});
});
