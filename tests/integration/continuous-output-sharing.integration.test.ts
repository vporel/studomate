import { ActionExecutionMode } from "@/schemas/grafcet/action.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import { GrafcetFactory } from "@tests/utils/grafcet-factory";
import { ProjectFactory } from "@tests/utils/project-factory";
import {
	compilePipelineDetailed,
	compileToPLC,
	expectVariableValue,
} from "@tests/utils/test-helpers";
import { VariableFactory } from "@tests/utils/variable-factory";

const CONTINUOUS = ActionExecutionMode.CONTINUOUS;

describe("Continuous boolean outputs shared between steps", () => {
	beforeEach(() => {
		jest.useFakeTimers();
		VariableFactory.reset();
		ProjectFactory.reset();
	});

	afterEach(() => {
		jest.useRealTimers();
	});

	function start(project: ReturnType<typeof ProjectFactory.create>) {
		let cycleError: Error | null = null;
		const plc = compileToPLC(project, 10, Dialect.FR, {
			onCycleError: (e) => {
				cycleError = e;
			},
		})!;
		expect(plc).not.toBeNull();
		return {
			plc,
			check: () => {
				if (cycleError) throw cycleError;
			},
		};
	}

	it("keeps the output TRUE when returning to a step that carries it (X0 -> X1 -> X0)", async () => {
		const i0 = VariableFactory.createLogicInput("I0");
		const q0 = VariableFactory.createLogicOutput("Q0");
		const g = GrafcetFactory.createCycleWithBooleanActions(
			"g",
			"Q0",
			"Q0",
			"I0",
			"NON I0",
			CONTINUOUS,
			CONTINUOUS,
		);
		const project = ProjectFactory.create([i0, q0], [g]);
		expect(compilePipelineDetailed(project).compilation.errors).toEqual([]);

		const { plc, check } = start(project);
		plc.setPhysicalInputValueByName("I0", false);
		plc.start();
		await jest.advanceTimersByTimeAsync(100);
		expectVariableValue(plc, "Q0", true);

		plc.setPhysicalInputValueByName("I0", true);
		await jest.advanceTimersByTimeAsync(100);
		expectVariableValue(plc, "X1", true);
		expectVariableValue(plc, "Q0", true);

		plc.setPhysicalInputValueByName("I0", false);
		for (let i = 0; i < 10; i++) {
			await jest.advanceTimersByTimeAsync(10);
			expectVariableValue(plc, "X0", true);
			expectVariableValue(plc, "Q0", true);
		}
		check();
		plc.stop();
	});

	it("drops the output when no carrying step is active", async () => {
		const i0 = VariableFactory.createLogicInput("I0");
		const q0 = VariableFactory.createLogicOutput("Q0");
		const g = GrafcetFactory.createCycleWithBooleanActions(
			"g",
			"",
			"Q0",
			"I0",
			"NON I0",
			CONTINUOUS,
			CONTINUOUS,
		);
		const { plc, check } = start(ProjectFactory.create([i0, q0], [g]));
		plc.setPhysicalInputValueByName("I0", false);
		plc.start();
		await jest.advanceTimersByTimeAsync(100);
		expectVariableValue(plc, "Q0", false);

		plc.setPhysicalInputValueByName("I0", true);
		await jest.advanceTimersByTimeAsync(100);
		expectVariableValue(plc, "Q0", true);

		plc.setPhysicalInputValueByName("I0", false);
		await jest.advanceTimersByTimeAsync(100);
		expectVariableValue(plc, "Q0", false);
		check();
		plc.stop();
	});

	it("keeps the output TRUE while another grafcet still carries it", async () => {
		const i0 = VariableFactory.createLogicInput("I0");
		const i1 = VariableFactory.createLogicInput("I1");
		const q0 = VariableFactory.createLogicOutput("Q0");
		const g1 = GrafcetFactory.createCycleWithBooleanActions(
			"g1",
			"",
			"Q0",
			"I0",
			"NON I0",
			CONTINUOUS,
			CONTINUOUS,
			0,
		);
		const g2 = GrafcetFactory.createCycleWithBooleanActions(
			"g2",
			"",
			"Q0",
			"I1",
			"NON I1",
			CONTINUOUS,
			CONTINUOUS,
			10,
		);
		const { plc, check } = start(ProjectFactory.create([i0, i1, q0], [g1, g2]));
		plc.setPhysicalInputValueByName("I0", true);
		plc.setPhysicalInputValueByName("I1", true);
		plc.start();
		await jest.advanceTimersByTimeAsync(200);
		expectVariableValue(plc, "Q0", true);

		plc.setPhysicalInputValueByName("I0", false);
		await jest.advanceTimersByTimeAsync(200);
		expectVariableValue(plc, "X1", false);
		expectVariableValue(plc, "X11", true);
		expectVariableValue(plc, "Q0", true);

		plc.setPhysicalInputValueByName("I1", false);
		await jest.advanceTimersByTimeAsync(200);
		expectVariableValue(plc, "Q0", false);
		check();
		plc.stop();
	});
});
