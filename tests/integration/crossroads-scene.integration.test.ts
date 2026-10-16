import { Dialect } from "@/expression-language/dialect.enum";
import type PLC from "@/simulator/core/plc/plc";
import Scene3dSimulationBridge from "@/ui/stores/project/managers/3d-scene/scene3d-simulation.bridge";
import type { CrossroadsState } from "@/3d-scenes/crossroads/v1/crossroads.model";
import {
	createCrossroadsProject,
	createCrossroadsSolution,
} from "@/templates/crossroads.template";
import type Project from "@/schemas/project/project.schema";
import { compileToPLC } from "@tests/utils/test-helpers";

jest.setTimeout(60000);

/** Runs a crossroads project with its 3D scene as plant model. */
function startCrossroads(project: Project, scanTimeMs = 20) {
	let plc: PLC | null = null;
	let cycleError: Error | null = null;
	let last: CrossroadsState | null = null;
	const bridge = new Scene3dSimulationBridge({
		getProject: () => project,
		applyExternalInputs: () => {},
	});
	bridge.subscribe((snapshot) => (last = snapshot.state as CrossroadsState));
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
		bridge,
		stop: () => {
			plc!.stop();
			bridge.onSimulationStop();
		},
		getState: () => last!,
		getError: () => cycleError,
	};
}

describe("crossroads template with its 3D scene", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("lets the solution run for minutes without any accident while cars keep flowing", async () => {
		const { stop, getState, getError } = startCrossroads(
			createCrossroadsSolution(),
		);
		let crashed = false;
		let maxCars = 0;
		for (let second = 0; second < 180; second++) {
			await jest.advanceTimersByTimeAsync(1000);
			const state = getState();
			crashed ||= state.crash !== null;
			maxCars = Math.max(
				maxCars,
				...Object.values(state.lanes).map((cars) => cars.length),
			);
		}
		if (getError()) throw getError();

		expect(crashed).toBe(false);
		expect(getState().accidents).toBe(0);
		expect(getState().nextCarId).toBeGreaterThan(20);
		expect(maxCars).toBeGreaterThan(0);
		stop();
	});

	it("follows the lights of the solution: the cars of the red axis wait", async () => {
		const { stop, getState } = startCrossroads(createCrossroadsSolution());
		await jest.advanceTimersByTimeAsync(9000);
		const state = getState();
		expect(state.lights.NS1.green).toBe(true);
		expect(state.lights.EO1.red).toBe(true);
		const waiting = state.lanes.EO1;
		expect(waiting.length).toBeGreaterThan(0);
		expect(waiting[0].v).toBe(0);
		stop();
	});

	it("keeps every car at its stop line when the student has not written a program yet", async () => {
		const { stop, getState, getError } = startCrossroads(
			createCrossroadsProject(),
		);
		await jest.advanceTimersByTimeAsync(40000);
		if (getError()) throw getError();
		const state = getState();
		expect(state.accidents).toBe(0);
		for (const cars of Object.values(state.lanes)) {
			expect(cars.length).toBeGreaterThan(0);
			expect(cars[0].v).toBe(0);
		}
		stop();
	});

	it("restarts from an empty plant after the simulation is stopped", async () => {
		const { stop, bridge, getState } = startCrossroads(
			createCrossroadsSolution(),
		);
		await jest.advanceTimersByTimeAsync(10000);
		expect(getState().nextCarId).toBeGreaterThan(1);
		stop();
		expect(bridge.getSnapshot()!.state).toMatchObject({
			nextCarId: 1,
			accidents: 0,
		});
	});
});
