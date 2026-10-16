import type { SceneModel, ScenePointValues } from "@/3d-scenes/scene-model";

/** Key of a traffic light, which is also the approach it regulates. */
export type LaneKey = "NS1" | "NS2" | "EO1" | "EO2";
export const LANE_KEYS: readonly LaneKey[] = ["NS1", "NS2", "EO1", "EO2"];

/** Half-width of the square where the two roads cross. */
export const HALF_CROSSING = 60;
/** Length of the road leading to the crossing. */
export const APPROACH = 300;
/** Distance from the centre of the crossing to the start (and to the end) of a road. */
export const ROAD_HALF = APPROACH + HALF_CROSSING;
/** Offset of a lane from the axis of its road. */
export const LANE_OFFSET = HALF_CROSSING / 2;
export const CAR_LENGTH = 40;
export const CAR_WIDTH = 20;
/** Position, along a lane, where the front of a stopped car waits. */
export const STOP_LINE = APPROACH - 15;
/** Model units per ms. */
export const CRUISE_SPEED = 0.08;
const ACCELERATION = 0.00006;
const COMFORT_BRAKING = 0.00006;
/** Hardest braking: a car that cannot stop with it before the line goes through. */
const MAX_BRAKING = 0.00012;
/** Below this speed a car always stops: the braking can only be off by a couple of units. */
const MIN_COMMIT_SPEED = 0.02;
const MIN_GAP = 12;
const EPSILON = 1e-6;
/** A new car appears only when the previous one of its lane is at least this far from the start. */
const SPAWN_CLEARANCE = 120;
const CRASH_DURATION_MS = 2500;

const SPAWN_INTERVAL_MS: Record<LaneKey, number> = {
	NS1: 3600,
	NS2: 4700,
	EO1: 4100,
	EO2: 5300,
};
const FIRST_SPAWN_MS: Record<LaneKey, number> = {
	NS1: 500,
	NS2: 2200,
	EO1: 1300,
	EO2: 3100,
};

type LaneGeometry = {
	axis: "x" | "z";
	/** +1 when the lane runs towards increasing coordinates along its axis. */
	direction: 1 | -1;
	/** Coordinate of the lane on the other axis. */
	offset: number;
	/** Rotation around the vertical axis of a car (whose length lies along z) driving on it. */
	heading: number;
};

/** Right-hand traffic: the light named after a side regulates the cars coming from that side. */
export const LANES: Record<LaneKey, LaneGeometry> = {
	NS1: { axis: "z", direction: 1, offset: -LANE_OFFSET, heading: 0 },
	NS2: { axis: "z", direction: -1, offset: LANE_OFFSET, heading: Math.PI },
	EO1: {
		axis: "x",
		direction: -1,
		offset: -LANE_OFFSET,
		heading: -Math.PI / 2,
	},
	EO2: { axis: "x", direction: 1, offset: LANE_OFFSET, heading: Math.PI / 2 },
};

export interface Car {
	id: number;
	/** Position of the centre of the car along its lane: 0 at the start of the road. */
	s: number;
	/** Speed along the lane. */
	v: number;
	/** The car decided to go through a light it could not stop at. */
	committed: boolean;
}

export interface LightState {
	red: boolean;
	orange: boolean;
	green: boolean;
}

export interface CrossroadsState {
	/** Cars of each lane, the one in front first. */
	lanes: Record<LaneKey, Car[]>;
	lights: Record<LaneKey, LightState>;
	spawnIn: Record<LaneKey, number>;
	nextCarId: number;
	/** Where two cars collided; the plant is frozen until the time runs out, then emptied. */
	crash: { x: number; z: number; remainingMs: number } | null;
	accidents: number;
}

export type CrossroadsInteraction = never;

const perLane = <T>(make: (key: LaneKey) => T): Record<LaneKey, T> => ({
	NS1: make("NS1"),
	NS2: make("NS2"),
	EO1: make("EO1"),
	EO2: make("EO2"),
});

/** Position of the centre of a car in the plane of the crossing (x east, z south). */
export function carPosition(
	lane: LaneKey,
	s: number,
): { x: number; z: number } {
	const { axis, direction, offset } = LANES[lane];
	const along = direction * (s - ROAD_HALF);
	return axis === "z" ? { x: offset, z: along } : { x: along, z: offset };
}

function carBounds(lane: LaneKey, s: number) {
	const { x, z } = carPosition(lane, s);
	const alongZ = LANES[lane].axis === "z";
	const halfX = (alongZ ? CAR_WIDTH : CAR_LENGTH) / 2;
	const halfZ = (alongZ ? CAR_LENGTH : CAR_WIDTH) / 2;
	return { x, z, halfX, halfZ };
}

function findCollision(
	lanes: Record<LaneKey, Car[]>,
): { x: number; z: number } | null {
	for (let a = 0; a < LANE_KEYS.length; a++) {
		for (let b = a + 1; b < LANE_KEYS.length; b++) {
			const laneA = LANE_KEYS[a];
			const laneB = LANE_KEYS[b];
			if (LANES[laneA].axis === LANES[laneB].axis) continue;
			for (const carA of lanes[laneA]) {
				const boundsA = carBounds(laneA, carA.s);
				for (const carB of lanes[laneB]) {
					const boundsB = carBounds(laneB, carB.s);
					const overlapsX =
						Math.abs(boundsA.x - boundsB.x) < boundsA.halfX + boundsB.halfX;
					const overlapsZ =
						Math.abs(boundsA.z - boundsB.z) < boundsA.halfZ + boundsB.halfZ;
					if (overlapsX && overlapsZ) {
						return {
							x: (boundsA.x + boundsB.x) / 2,
							z: (boundsA.z + boundsB.z) / 2,
						};
					}
				}
			}
		}
	}
	return null;
}

function stoppingDistance(speed: number, braking: number): number {
	return (speed * speed) / (2 * braking);
}

function moveCar(
	car: Car,
	ahead: Car | undefined,
	mayGo: boolean,
	dtMs: number,
): Car {
	let wall = Infinity;
	let committed = car.committed;
	if (ahead) wall = ahead.s - CAR_LENGTH - MIN_GAP;

	const front = car.s + CAR_LENGTH / 2;
	if (!mayGo && !committed && front <= STOP_LINE + EPSILON) {
		const distance = STOP_LINE - front;
		if (
			car.v > MIN_COMMIT_SPEED &&
			stoppingDistance(car.v, MAX_BRAKING) > distance
		) {
			committed = true;
		} else {
			wall = Math.min(wall, STOP_LINE - CAR_LENGTH / 2);
		}
	}

	const room = Math.max(0, wall - car.s);
	const targetSpeed = Math.min(
		CRUISE_SPEED,
		Math.sqrt(2 * COMFORT_BRAKING * room),
	);
	const v =
		targetSpeed >= car.v
			? Math.min(targetSpeed, car.v + ACCELERATION * dtMs)
			: Math.max(targetSpeed, car.v - MAX_BRAKING * dtMs);
	const s = car.s + v * dtMs;
	if (s >= wall) return { ...car, s: wall, v: 0, committed };
	return { ...car, s, v, committed };
}

function readLights(actuators: ScenePointValues): Record<LaneKey, LightState> {
	return perLane((key) => ({
		red: actuators[`red${key}`] === true,
		orange: actuators[`orange${key}`] === true,
		green: actuators[`green${key}`] === true,
	}));
}

function spawn(state: CrossroadsState, dtMs: number): CrossroadsState {
	const lanes = { ...state.lanes };
	const spawnIn = { ...state.spawnIn };
	let nextCarId = state.nextCarId;
	for (const key of LANE_KEYS) {
		spawnIn[key] = Math.max(0, spawnIn[key] - dtMs);
		if (spawnIn[key] > 0) continue;
		const cars = lanes[key];
		const last = cars[cars.length - 1];
		if (last && last.s < SPAWN_CLEARANCE) continue;
		lanes[key] = [
			...cars,
			{ id: nextCarId++, s: CAR_LENGTH / 2, v: CRUISE_SPEED, committed: false },
		];
		spawnIn[key] = SPAWN_INTERVAL_MS[key];
	}
	return { ...state, lanes, spawnIn, nextCarId };
}

const CrossroadsModel: SceneModel<CrossroadsState, CrossroadsInteraction> = {
	createState() {
		return {
			lanes: perLane(() => []),
			lights: readLights({}),
			spawnIn: { ...FIRST_SPAWN_MS },
			nextCarId: 1,
			crash: null,
			accidents: 0,
		};
	},

	step(state, dtMs, actuators) {
		const lights = readLights(actuators);
		if (state.crash) {
			const remainingMs = state.crash.remainingMs - dtMs;
			if (remainingMs > 0) {
				return { ...state, lights, crash: { ...state.crash, remainingMs } };
			}
			return {
				...state,
				lights,
				lanes: perLane(() => []),
				spawnIn: { ...FIRST_SPAWN_MS },
				crash: null,
			};
		}

		const moved = perLane((key) => {
			const light = lights[key];
			const mayGo = light.green && !light.red;
			const cars: Car[] = [];
			for (const car of state.lanes[key]) {
				cars.push(moveCar(car, cars[cars.length - 1], mayGo, dtMs));
			}
			return cars.filter((car) => car.s - CAR_LENGTH / 2 <= 2 * ROAD_HALF);
		});

		const crash = findCollision(moved);
		if (crash) {
			return {
				...state,
				lanes: moved,
				lights,
				crash: { ...crash, remainingMs: CRASH_DURATION_MS },
				accidents: state.accidents + 1,
			};
		}
		return spawn({ ...state, lanes: moved, lights }, dtMs);
	},

	readSensors(): ScenePointValues {
		return {};
	},

	applyInteraction(state) {
		return state;
	},
};

export default CrossroadsModel;
