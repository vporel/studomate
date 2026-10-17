import {
	createCoilElement,
	createContactElement,
	createRailTerminalElement,
} from "@/schemas/ladder/element.schema";
import { createCounterBlockElement } from "@/schemas/ladder/function-blocks/counter.schema";
import { wireInSeries, wireLadderIntoMain } from "@tests/utils/ladder-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import {
	compilePipelineDetailed,
	compileToPLC,
	getVariableValue,
} from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

describe("Compteur ladder : littéral booléen sur la pinoche R", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	function buildProject(control: string) {
		const project = ProjectFactory.createWithVariables([
			VariableFactory.createLogicInput("I0"),
			VariableFactory.createLogicOutput("Q0"),
		]);
		const ladder = project.createLadder("Ladder 1");
		wireLadderIntoMain(project, ladder);
		const section = ladder.sections[0];
		const elements = [
			createRailTerminalElement(0),
			createContactElement("I0", "NO", 0, 1),
			createCounterBlockElement(
				{ name: "Compteur1", counterType: "CTU", control, pv: "3" },
				0,
				2,
			),
			createCoilElement("Q0", "normal", 0, 3),
		];
		ladder.addElements(section.id, elements);
		ladder.addConnections(section.id, wireInSeries(elements));
		return project;
	}

	async function pulseTwice(control: string) {
		const project = buildProject(control);
		const pipeline = compilePipelineDetailed(project);
		expect(
			pipeline.analysis.issues.filter((i) => i.severity === "error"),
		).toEqual([]);
		expect(pipeline.preCompilation.errors).toEqual([]);
		expect(pipeline.compilation.errors).toEqual([]);

		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, undefined, {
			onCycleError: (e) => (cycleError = e),
		})!;
		expect(plc).not.toBeNull();
		plc.start();
		for (let i = 0; i < 2; i++) {
			plc.setPhysicalInputValueByName("I0", true);
			await jest.advanceTimersByTimeAsync(30);
			plc.setPhysicalInputValueByName("I0", false);
			await jest.advanceTimersByTimeAsync(30);
		}
		plc.stop();
		if (cycleError) throw cycleError;
		return getVariableValue(plc, "Compteur1.CV");
	}

	it("R = FAUX : compile sans erreur et le compteur compte", async () => {
		expect(await pulseTwice("FAUX")).toBe(2);
	});

	it("R = VRAI : compile sans erreur et le compteur reste à zéro", async () => {
		expect(await pulseTwice("VRAI")).toBe(0);
	});
});
