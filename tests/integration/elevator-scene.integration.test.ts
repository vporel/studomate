import { Dialect } from "@/expression-language/dialect.enum";
import type {
	ElevatorButton,
	ElevatorState,
} from "@/3d-scenes/elevator/v1/elevator.model";
import type PLC from "@/simulator/core/plc/plc";
import Scene3dSimulationBridge from "@/ui/stores/project/managers/3d-scene/scene3d-simulation.bridge";
import {
	createElevatorProject,
	createElevatorSolution,
} from "@/templates/elevator.template";
import type Project from "@/schemas/project/project.schema";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";

jest.setTimeout(30000);

/** Runs an elevator project with its 3D scene as plant model. */
function startElevator(project: Project, scanTimeMs = 10) {
	let plc: PLC | null = null;
	let cycleError: Error | null = null;
	let last: ElevatorState | null = null;
	const bridge = new Scene3dSimulationBridge({
		getProject: () => project,
		applyExternalInputs: (values) => {
			for (const [id, value] of values) {
				plc!.setPhysicalInputValueById(id, value);
			}
		},
	});
	bridge.subscribe((snapshot) => (last = snapshot.state as ElevatorState));
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

	const press = async (button: ElevatorButton) => {
		bridge.queueInteraction({ type: "pressButton", button });
		await jest.advanceTimersByTimeAsync(scanTimeMs * 4);
		bridge.queueInteraction({ type: "releaseButton", button });
	};
	return {
		plc: plc!,
		bridge,
		press,
		stop: () => {
			plc!.stop();
			bridge.onSimulationStop();
		},
		getState: () => last!,
		getError: () => cycleError,
	};
}

describe("elevator template with its 3D scene", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("sees the cabin at the ground floor, door closed, from the first scan", async () => {
		const { plc, stop, getError } = startElevator(createElevatorProject());
		await jest.advanceTimersByTimeAsync(50);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "etage_0")).toBe(true);
		expect(getVariableValue(plc, "etage_1")).toBe(false);
		expect(getVariableValue(plc, "porte_ouverte")).toBe(false);
		expect(getVariableValue(plc, "position")).toBe(0);
		expect(getVariableValue(plc, "etage_courant")).toBe(0);
		stop();
	});

	it("keeps the cabin at rest while the student has not written a program yet", async () => {
		const { getState, stop, getError } = startElevator(createElevatorProject());
		await jest.advanceTimersByTimeAsync(3000);
		if (getError()) throw getError();
		expect(getState()).toMatchObject({ position: 0, doorPosition: 0 });
		stop();
	});

	it("serves a call to the top floor, opens the door, then comes back to the ground floor", async () => {
		const { press, plc, getState, stop, getError } = startElevator(
			createElevatorSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);

		await press("landingButton2");
		await jest.advanceTimersByTimeAsync(6000);
		if (getError()) throw getError();
		expect(getState().position).toBeGreaterThan(195);
		expect(getVariableValue(plc, "etage_2")).toBe(true);
		expect(getVariableValue(plc, "etage_courant")).toBe(2);

		await jest.advanceTimersByTimeAsync(8000);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "porte")).toBe(false);
		expect(getVariableValue(plc, "porte_ouverte")).toBe(false);
		expect(getState().doorPosition).toBe(0);

		await press("cabinButton0");
		await jest.advanceTimersByTimeAsync(12000);
		if (getError()) throw getError();
		expect(getState().position).toBeLessThan(5);
		expect(getVariableValue(plc, "etage_courant")).toBe(0);
		expect(getVariableValue(plc, "descendre")).toBe(false);
		stop();
	});

	it("opens the door only once the cabin has stopped, and keeps it open at least 2 s", async () => {
		const { press, plc, getState, stop } = startElevator(
			createElevatorSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		await press("landingButton1");
		let openedWhileMoving = false;
		let openAt: number | null = null;
		let closingAt: number | null = null;
		for (let elapsed = 0; elapsed < 14000; elapsed += 50) {
			await jest.advanceTimersByTimeAsync(50);
			const state = getState();
			if (state.doorPosition > 0 && getVariableValue(plc, "monter") === true) {
				openedWhileMoving = true;
			}
			if (openAt === null && state.doorPosition >= 100) openAt = elapsed;
			if (openAt !== null && closingAt === null && state.doorPosition < 100) {
				closingAt = elapsed;
			}
		}
		expect(openedWhileMoving).toBe(false);
		expect(openAt).not.toBeNull();
		expect(closingAt).not.toBeNull();
		expect(closingAt! - openAt!).toBeGreaterThanOrEqual(2000);
		stop();
	});

	it("restarts from the ground floor with the door closed after the simulation is stopped", async () => {
		const { press, bridge, getState, stop } = startElevator(
			createElevatorSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		await press("landingButton2");
		await jest.advanceTimersByTimeAsync(2000);
		expect(getState().position).toBeGreaterThan(0);
		stop();
		expect(bridge.getSnapshot()!.state).toMatchObject({
			position: 0,
			doorPosition: 0,
		});
	});
});
