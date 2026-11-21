import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import type Project from "@/schemas/project/project.schema";
import {
	coil,
	nf,
	no,
	or,
	section,
	setMainSections,
} from "@/templates/training/utils/ladder-dsl";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import {
	compilePipelineDetailed,
	createPLC,
	expectVariableValue,
} from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

const { SET, RESET, CONTINUOUS } = ActionExecutionMode;

function start(project: Project) {
	const { analysis, compilation } = compilePipelineDetailed(project);
	const plc = createPLC(compilation.result!, 10);
	plc.start();
	return { plc, issues: analysis.issues };
}

describe("Boolean variable written by a grafcet action and by another writer", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});
	afterEach(() => jest.useRealTimers());

	describe("SET on a variable driven by a continuous action", () => {
		function buildProject() {
			//The initial step of g1 SETs Q0 as soon as it is activated.
			const g1 = GrafcetFactory.createCycleWithBooleanActions(
				"g1",
				"Q0",
				"",
				"FAUX",
				"FAUX",
				SET,
			);
			//The only continuous action on Q0 sits on a step that never becomes active.
			const g2 = GrafcetFactory.createCycleWithBooleanActions(
				"g2",
				"",
				"Q0",
				"FAUX",
				"FAUX",
				CONTINUOUS,
				CONTINUOUS,
				10,
			);
			return ProjectFactory.create(
				[VariableFactory.createLogicOutput("Q0")],
				[g1, g2],
			);
		}

		it("is reported as an analysis error", () => {
			const { analysis } = compilePipelineDetailed(buildProject());

			expect(analysis.issues.map((i) => `${i.severity}:${i.code}`)).toEqual([
				"error:ACTION_STORED_OVERRIDDEN_BY_CONTINUOUS",
			]);
		});

		it("never holds the SET value, which is what the error reports", async () => {
			const { plc } = start(buildProject());
			await jest.advanceTimersByTimeAsync(100);

			expectVariableValue(plc, "X0", true);
			expectVariableValue(plc, "Q0", false);
			plc.stop();
		});
	});

	describe("ladder self-holding rung driven by the grafcet (valid, no issue)", () => {
		it("latches a SET from the grafcet", async () => {
			const project = ProjectFactory.create(
				[
					VariableFactory.createMemoryBool("M"),
					VariableFactory.createLogicInput("Go"),
					VariableFactory.createLogicInput("Stop"),
				],
				[
					GrafcetFactory.createCycleWithBooleanActions(
						"g",
						"",
						"M",
						"Go",
						"FAUX",
						SET,
						SET,
					),
				],
			);
			setMainSections(project, [
				section("hold", "", no("M"), nf("Stop"), coil("M")),
			]);
			const { plc, issues } = start(project);
			await jest.advanceTimersByTimeAsync(50);
			expectVariableValue(plc, "M", false);

			plc.setPhysicalInputValueByName("Go", true);
			await jest.advanceTimersByTimeAsync(100);

			expect(issues).toEqual([]);
			expectVariableValue(plc, "M", true);
			plc.stop();
		});

		it("clears a memorised fault with a RESET from the grafcet", async () => {
			const project = ProjectFactory.create(
				[
					VariableFactory.createMemoryBool("M"),
					VariableFactory.createLogicInput("Fault"),
					VariableFactory.createLogicInput("Ack"),
				],
				[
					GrafcetFactory.createCycleWithBooleanActions(
						"g",
						"",
						"M",
						"Ack",
						"FAUX",
						RESET,
						RESET,
					),
				],
			);
			setMainSections(project, [
				section("fault", "", or([no("Fault")], [no("M")]), coil("M")),
			]);
			const { plc, issues } = start(project);
			plc.setPhysicalInputValueByName("Fault", true);
			await jest.advanceTimersByTimeAsync(50);
			plc.setPhysicalInputValueByName("Fault", false);
			await jest.advanceTimersByTimeAsync(50);
			expectVariableValue(plc, "M", true);

			plc.setPhysicalInputValueByName("Ack", true);
			await jest.advanceTimersByTimeAsync(100);

			expect(issues).toEqual([]);
			expectVariableValue(plc, "M", false);
			plc.stop();
		});
	});
});
