import { Dialect } from "@/expression-language/dialect.enum";
import type { DrillingState } from "@/3d-scenes/drilling/drilling.model";
import type PLC from "@/simulator/core/plc/plc";
import Scene3dSimulationBridge from "@/ui/stores/project/managers/3d-scene/scene3d-simulation.bridge";
import {
	createDrillingProject,
	createDrillingSolution,
} from "@/templates/drilling.template";
import type Project from "@/schemas/project/project.schema";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";

jest.setTimeout(30000);

/** Runs a drilling project with its 3D scene as plant model. */
function startDrilling(project: Project, scanTimeMs = 10) {
	let plc: PLC | null = null;
	let cycleError: Error | null = null;
	let last: DrillingState | null = null;
	const bridge = new Scene3dSimulationBridge({
		getProject: () => project,
		applyExternalInputs: (values) => {
			for (const [id, value] of values) {
				plc!.setPhysicalInputValueById(id, value);
			}
		},
	});
	bridge.subscribe((snapshot) => (last = snapshot.state as DrillingState));
	plc = compileToPLC(project, scanTimeMs, Dialect.FR, {
		onCycleEnd: (instance) =>
			bridge.onCycleEnd(
				instance.getVariablesSnapshot(),
				instance.getLastCycleDeltaMs(),
			),
		onCycleError: (error) => (cycleError = error),
	})!;
	expect(plc).not.toBeNull();
	bridge.onSimulationStart();
	plc.start();
	return {
		plc: plc!,
		stop: () => {
			plc!.stop();
			bridge.onSimulationStop();
		},
		getState: () => last!,
		getError: () => cycleError,
	};
}

describe("drilling template with its 3D scene", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("sees the drill at the top limit from the first scan", async () => {
		const { plc, stop, getError } = startDrilling(createDrillingProject());
		await jest.advanceTimersByTimeAsync(50);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "h")).toBe(true);
		expect(getVariableValue(plc, "b")).toBe(false);
		expect(getVariableValue(plc, "position")).toBe(0);
		stop();
	});

	it("keeps the drill at rest while the student has not written a program yet", async () => {
		const { getState, stop, getError } = startDrilling(createDrillingProject());
		await jest.advanceTimersByTimeAsync(3000);
		if (getError()) throw getError();
		expect(getState()).toMatchObject({ position: 0, holeProgress: 0 });
		stop();
	});

	it("runs a full cycle on `dcy`: down, drilling, back up, hole made", async () => {
		const { plc, getState, stop, getError } = startDrilling(
			createDrillingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);

		plc.setPhysicalInputValueByName("dcy", true);
		await jest.advanceTimersByTimeAsync(40);
		plc.setPhysicalInputValueByName("dcy", false);

		await jest.advanceTimersByTimeAsync(10000);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "b")).toBe(false);
		expect(getVariableValue(plc, "h")).toBe(true);
		expect(getVariableValue(plc, "position")).toBe(0);
		expect(getVariableValue(plc, "descendre")).toBe(false);
		expect(getVariableValue(plc, "monter")).toBe(false);
		expect(getVariableValue(plc, "broche")).toBe(false);
		expect(getState().holeProgress).toBe(1);
		stop();
	});
});
