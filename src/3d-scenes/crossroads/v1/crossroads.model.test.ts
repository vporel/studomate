import CrossroadsModel, {
	CAR_LENGTH,
	CRUISE_SPEED,
	LANE_KEYS,
	STOP_LINE,
	carPosition,
	type CrossroadsState,
	type LaneKey,
} from "./crossroads.model";
import type { ScenePointValues } from "@/3d-scenes/scene-model";

const STEP_MS = 10;

function lightsOn(...points: string[]): ScenePointValues {
	return Object.fromEntries(points.map((point) => [point, true]));
}

const NS_GREEN = lightsOn("greenNS1", "greenNS2", "redEO1", "redEO2");
const EO_GREEN = lightsOn("greenEO1", "greenEO2", "redNS1", "redNS2");
const ALL_RED = lightsOn("redNS1", "redNS2", "redEO1", "redEO2");

function run(
	state: CrossroadsState,
	durationMs: number,
	actuators: ScenePointValues,
): CrossroadsState {
	let next = state;
	for (let elapsed = 0; elapsed < durationMs; elapsed += STEP_MS) {
		next = CrossroadsModel.step(next, STEP_MS, actuators);
	}
	return next;
}

function frontOf(state: CrossroadsState, lane: LaneKey): number {
	return state.lanes[lane][0].s + CAR_LENGTH / 2;
}

describe("crossroads model", () => {
	it("starts empty with every light off and no sensor", () => {
		const state = CrossroadsModel.createState();
		expect(LANE_KEYS.every((lane) => state.lanes[lane].length === 0)).toBe(
			true,
		);
		expect(
			LANE_KEYS.every(
				(lane) =>
					!state.lights[lane].red &&
					!state.lights[lane].orange &&
					!state.lights[lane].green,
			),
		).toBe(true);
		expect(state.crash).toBeNull();
		expect(CrossroadsModel.readSensors(state)).toEqual({});
	});

	it("records the lights it is given", () => {
		const state = CrossroadsModel.step(
			CrossroadsModel.createState(),
			STEP_MS,
			lightsOn("orangeNS2", "greenEO1"),
		);
		expect(state.lights.NS2).toEqual({
			red: false,
			orange: true,
			green: false,
		});
		expect(state.lights.EO1).toEqual({
			red: false,
			orange: false,
			green: true,
		});
		expect(state.lights.NS1).toEqual({
			red: false,
			orange: false,
			green: false,
		});
	});

	it("spawns cars on a cadence of its own for each lane", () => {
		const state = run(CrossroadsModel.createState(), 600, ALL_RED);
		expect(state.lanes.NS1).toHaveLength(1);
		expect(state.lanes.NS2).toHaveLength(0);
		expect(state.lanes.EO1).toHaveLength(0);
	});

	it("does not spawn a car on top of one still near the start", () => {
		const state = run(CrossroadsModel.createState(), 60000, ALL_RED);
		for (const lane of LANE_KEYS) {
			const cars = state.lanes[lane];
			for (let i = 1; i < cars.length; i++) {
				expect(cars[i - 1].s - cars[i].s).toBeGreaterThanOrEqual(CAR_LENGTH);
			}
		}
	});

	it("stops cars at the stop line when every light is red, and when none is lit", () => {
		for (const lights of [ALL_RED, {}]) {
			const state = run(CrossroadsModel.createState(), 20000, lights);
			expect(state.crash).toBeNull();
			for (const lane of LANE_KEYS) {
				expect(state.lanes[lane].length).toBeGreaterThan(0);
				expect(frontOf(state, lane)).toBeLessThanOrEqual(STOP_LINE + 1e-6);
				expect(state.lanes[lane][0].v).toBe(0);
			}
		}
	});

	it("lets the queue of a red lane pile up without overlapping", () => {
		const state = run(CrossroadsModel.createState(), 60000, ALL_RED);
		const cars = state.lanes.NS1;
		expect(cars.length).toBeGreaterThan(2);
		for (let i = 1; i < cars.length; i++) {
			expect(cars[i - 1].s - cars[i].s).toBeGreaterThan(CAR_LENGTH);
		}
	});

	it("stops at orange when it can, with an orange light only", () => {
		const state = run(
			CrossroadsModel.createState(),
			20000,
			lightsOn("orangeNS1", "orangeNS2", "orangeEO1", "orangeEO2"),
		);
		expect(state.crash).toBeNull();
		expect(frontOf(state, "NS1")).toBeLessThanOrEqual(STOP_LINE + 1e-6);
	});

	it("treats red as stronger than green on the same lane", () => {
		const state = run(
			CrossroadsModel.createState(),
			20000,
			lightsOn("greenNS1", "redNS1"),
		);
		expect(frontOf(state, "NS1")).toBeLessThanOrEqual(STOP_LINE + 1e-6);
	});

	it("restarts the queue and carries cars out of the plant on green", () => {
		let state = run(CrossroadsModel.createState(), 20000, ALL_RED);
		const waiting = state.lanes.NS1[0].id;
		state = run(state, 400, NS_GREEN);
		expect(state.lanes.NS1[0].v).toBeGreaterThan(0);
		state = run(state, 20000, NS_GREEN);
		expect(state.lanes.NS1.some((car) => car.id === waiting)).toBe(false);
		expect(state.crash).toBeNull();
	});

	it("never collides when the axes alternate with an all-red phase", () => {
		let state = CrossroadsModel.createState();
		for (let cycle = 0; cycle < 8; cycle++) {
			state = run(state, 10000, NS_GREEN);
			state = run(
				state,
				2000,
				lightsOn("orangeNS1", "orangeNS2", "redEO1", "redEO2"),
			);
			state = run(state, 2000, ALL_RED);
			state = run(state, 10000, EO_GREEN);
			state = run(
				state,
				2000,
				lightsOn("redNS1", "redNS2", "orangeEO1", "orangeEO2"),
			);
			state = run(state, 2000, ALL_RED);
			expect(state.crash).toBeNull();
		}
		expect(state.accidents).toBe(0);
	});

	it("lets a car that cannot stop in time go through the orange", () => {
		let state = CrossroadsModel.createState();
		state = {
			...state,
			lanes: {
				...state.lanes,
				NS1: [
					{
						id: 1,
						s: STOP_LINE - CAR_LENGTH / 2 - 5,
						v: CRUISE_SPEED,
						committed: false,
					},
				],
			},
			spawnIn: { NS1: 1e9, NS2: 1e9, EO1: 1e9, EO2: 1e9 },
		};
		state = run(state, 500, lightsOn("orangeNS1"));
		expect(state.lanes.NS1[0].committed).toBe(true);
		expect(frontOf(state, "NS1")).toBeGreaterThan(STOP_LINE);
	});

	it("collides when both axes get green together, then freezes the plant", () => {
		const bothGreen = lightsOn("greenNS1", "greenNS2", "greenEO1", "greenEO2");
		let state = CrossroadsModel.createState();
		let steps = 0;
		while (!state.crash && steps < 6000) {
			state = CrossroadsModel.step(state, STEP_MS, bothGreen);
			steps++;
		}
		expect(state.crash).not.toBeNull();
		expect(state.accidents).toBe(1);

		const frozen = CrossroadsModel.step(state, STEP_MS, bothGreen);
		expect(frozen.lanes).toEqual(state.lanes);
		expect(frozen.crash!.remainingMs).toBeLessThan(state.crash!.remainingMs);
	});

	it("puts the crash where the two cars met, inside the crossing", () => {
		const bothGreen = lightsOn("greenNS1", "greenEO1");
		let state = CrossroadsModel.createState();
		while (!state.crash)
			state = CrossroadsModel.step(state, STEP_MS, bothGreen);
		expect(Math.abs(state.crash.x)).toBeLessThan(80);
		expect(Math.abs(state.crash.z)).toBeLessThan(80);
	});

	it("empties the roads after a collision and starts again, keeping the accident count", () => {
		const bothGreen = lightsOn("greenNS1", "greenNS2", "greenEO1", "greenEO2");
		let state = CrossroadsModel.createState();
		while (!state.crash)
			state = CrossroadsModel.step(state, STEP_MS, bothGreen);
		state = run(state, 3000, ALL_RED);
		expect(state.crash).toBeNull();
		expect(state.accidents).toBe(1);
		expect(LANE_KEYS.every((lane) => state.lanes[lane].length <= 1)).toBe(true);
		state = run(state, 20000, ALL_RED);
		expect(state.crash).toBeNull();
		expect(state.lanes.NS1.length).toBeGreaterThan(0);
	});

	it("keeps lights up to date while the plant is frozen", () => {
		const bothGreen = lightsOn("greenNS1", "greenEO1");
		let state = CrossroadsModel.createState();
		while (!state.crash)
			state = CrossroadsModel.step(state, STEP_MS, bothGreen);
		state = CrossroadsModel.step(state, STEP_MS, ALL_RED);
		expect(state.lights.NS1).toEqual({
			red: true,
			orange: false,
			green: false,
		});
	});

	it("does not mutate the state it is given", () => {
		const initial = run(CrossroadsModel.createState(), 3000, NS_GREEN);
		const copy = structuredClone(initial);
		CrossroadsModel.step(initial, STEP_MS, NS_GREEN);
		expect(initial).toEqual(copy);
	});

	it("ignores interactions", () => {
		const state = CrossroadsModel.createState();
		expect(CrossroadsModel.applyInteraction(state, undefined as never)).toBe(
			state,
		);
	});

	it("places cars on the right-hand lane of their road", () => {
		const north = carPosition("NS1", 0);
		const south = carPosition("NS2", 0);
		expect(north.z).toBeLessThan(0);
		expect(south.z).toBeGreaterThan(0);
		expect(north.x).toBeLessThan(south.x);
		const east = carPosition("EO1", 0);
		const west = carPosition("EO2", 0);
		expect(east.x).toBeGreaterThan(0);
		expect(west.x).toBeLessThan(0);
		expect(east.z).toBeLessThan(west.z);
	});
});
