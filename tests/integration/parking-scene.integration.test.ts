import { Dialect } from "@/expression-language/dialect.enum";
import { BARRIER_CLEAR } from "@/3d-scenes/parking/v1/parking.model";
import type {
	ParkingInteraction,
	ParkingState,
} from "@/3d-scenes/parking/v1/parking.model";
import type PLC from "@/simulator/core/plc/plc";
import Scene3dSimulationBridge from "@/ui/stores/project/managers/3d-scene/scene3d-simulation.bridge";
import {
	createParkingProject,
	createParkingSolution,
} from "@/templates/parking.template";
import type Project from "@/schemas/project/project.schema";
import { compileToPLC, getVariableValue } from "@tests/utils/test-helpers";

jest.setTimeout(30000);

/** Runs a parking project with its 3D scene as plant model. */
function startParking(project: Project, scanTimeMs = 10) {
	let plc: PLC | null = null;
	let cycleError: Error | null = null;
	let last: ParkingState | null = null;
	const bridge = new Scene3dSimulationBridge({
		getProject: () => project,
		applyExternalInputs: (values) => {
			for (const [id, value] of values) {
				plc!.setPhysicalInputValueById(id, value);
			}
		},
	});
	bridge.subscribe((snapshot) => (last = snapshot.state as ParkingState));
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

	const act = (interaction: ParkingInteraction) =>
		bridge.queueInteraction(interaction);
	return {
		plc: plc!,
		bridge,
		act,
		stop: () => {
			plc!.stop();
			bridge.onSimulationStop();
		},
		getState: () => last!,
		getError: () => cycleError,
	};
}

const arrival = { type: "arrival" } as const;
const departure = { type: "departure" } as const;

describe("parking template with its 3D scene", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("starts with an empty lot, closed barriers and no car detected", async () => {
		const { plc, stop, getError } = startParking(createParkingProject());
		await jest.advanceTimersByTimeAsync(50);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "passage")).toBe(false);
		expect(getVariableValue(plc, "dem_entree")).toBe(false);
		expect(getVariableValue(plc, "dem_sortie")).toBe(false);
		expect(getVariableValue(plc, "places")).toBe(0);
		stop();
	});

	it("shows the PLC a waiting car, and keeps it outside while no program is written", async () => {
		const { act, plc, getState, stop, getError } = startParking(
			createParkingProject(),
		);
		await jest.advanceTimersByTimeAsync(50);
		act(arrival);
		await jest.advanceTimersByTimeAsync(12000);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "dem_entree")).toBe(true);
		expect(getState().barriers).toEqual({ entry: 0, exit: 0 });
		expect(getState().cars[0]).toMatchObject({
			phase: "arriving",
			stall: null,
		});
		stop();
	});

	it("lets in a car, counts it, and closes the barrier behind it", async () => {
		const { act, plc, getState, stop, getError } = startParking(
			createParkingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		act(arrival);
		let entryWasOpen = false;
		let sawCarUnderBarrier = false;
		for (let elapsed = 0; elapsed < 18000; elapsed += 50) {
			await jest.advanceTimersByTimeAsync(50);
			entryWasOpen ||= getState().barriers.entry >= BARRIER_CLEAR;
			sawCarUnderBarrier ||= getVariableValue(plc, "passage") === true;
		}
		if (getError()) throw getError();
		expect(entryWasOpen).toBe(true);
		expect(sawCarUnderBarrier).toBe(true);
		expect(getState().cars).toHaveLength(1);
		expect(getState().cars[0].phase).toBe("parked");
		expect(getState().barriers).toEqual({ entry: 0, exit: 0 });
		expect(getVariableValue(plc, "barriere_entree")).toBe(false);
		expect(getVariableValue(plc, "places")).toBe(1);
		expect(getState().places).toBe(1);
		stop();
	});

	it("serves several queued cars, fills the lot, lights the full lamp and keeps the others out", async () => {
		const { act, plc, getState, stop, getError } = startParking(
			createParkingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		for (let i = 0; i < 6; i++) {
			act(arrival);
			await jest.advanceTimersByTimeAsync(800);
		}
		await jest.advanceTimersByTimeAsync(60000);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "places")).toBe(4);
		expect(getVariableValue(plc, "complet")).toBe(true);
		expect(getState().full).toBe(true);
		const cars = getState().cars;
		expect(cars.filter((car) => car.phase === "parked")).toHaveLength(4);
		expect(cars.filter((car) => car.phase === "arriving")).toHaveLength(2);
		expect(getVariableValue(plc, "dem_entree")).toBe(true);
		expect(getState().barriers.entry).toBe(0);
		stop();
	});

	it("lets a waiting car in as soon as a place is freed, without any new request", async () => {
		const { act, plc, getState, stop, getError } = startParking(
			createParkingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		for (let i = 0; i < 5; i++) {
			act(arrival);
			await jest.advanceTimersByTimeAsync(800);
		}
		await jest.advanceTimersByTimeAsync(60000);
		expect(getVariableValue(plc, "places")).toBe(4);
		expect(getState().cars.filter((c) => c.phase === "arriving")).toHaveLength(
			1,
		);

		act(departure);
		await jest.advanceTimersByTimeAsync(40000);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "places")).toBe(4);
		expect(getState().cars).toHaveLength(4);
		expect(getState().cars.every((car) => car.phase === "parked")).toBe(true);
		stop();
	});

	it("lets a car out through the exit barrier and frees a place", async () => {
		const { act, plc, getState, stop, getError } = startParking(
			createParkingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		for (let i = 0; i < 2; i++) {
			act(arrival);
			await jest.advanceTimersByTimeAsync(800);
		}
		await jest.advanceTimersByTimeAsync(30000);
		act(departure);
		await jest.advanceTimersByTimeAsync(25000);
		if (getError()) throw getError();
		expect(getVariableValue(plc, "places")).toBe(1);
		expect(getState().cars).toHaveLength(1);
		expect(getState().barriers).toEqual({ entry: 0, exit: 0 });
		stop();
	});

	it("ignores a departure request when nobody is parked", async () => {
		const { act, plc, getState, stop, getError } = startParking(
			createParkingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		act(departure);
		await jest.advanceTimersByTimeAsync(5000);
		if (getError()) throw getError();
		expect(getState().cars).toHaveLength(0);
		expect(getVariableValue(plc, "places")).toBe(0);
		expect(getVariableValue(plc, "barriere_sortie")).toBe(false);
		stop();
	});

	it("restarts with an empty lot after the simulation is stopped", async () => {
		const { act, bridge, getState, stop } = startParking(
			createParkingSolution(),
		);
		await jest.advanceTimersByTimeAsync(50);
		act(arrival);
		await jest.advanceTimersByTimeAsync(2000);
		expect(getState().cars).toHaveLength(1);
		stop();
		expect(bridge.getSnapshot()!.state).toMatchObject({
			cars: [],
			barriers: { entry: 0, exit: 0 },
		});
	});
});
