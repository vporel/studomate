import { clamp } from "@/3d-scenes/scene-math";
import type { SceneModel, ScenePointValues } from "@/3d-scenes/scene-model";

/** Number of stalls, which is also the capacity the program is expected to enforce. */
export const PARKING_CAPACITY = 4;
/** Cars that can exist at once, parked, waiting or leaving. */
export const MAX_CARS = 6;
/** Travel of a barrier arm, from closed (0) to open. */
export const BARRIER_TRAVEL = 100;
/** Speed of a barrier arm, in model units per ms. */
export const BARRIER_SPEED_PER_MS = 0.08;
/** A car goes through only when the arm is at least this open. */
export const BARRIER_CLEAR = 90;
export const CAR_LENGTH = 40;
export const CAR_WIDTH = 20;
/** Speed of a car, in model units per ms. */
export const CAR_SPEED_PER_MS = 0.08;
/** Distance between two cars on the same path, bumper to bumper. */
const MIN_GAP = 12;
/** Lateral tolerance within which another car is in front of a car. */
const LANE_TOLERANCE = CAR_WIDTH * 0.9;
/** Distance between the start of the street and the barriers. */
export const STREET_LENGTH = 360;
/** Offset of the entry lane (towards +z) and of the exit lane (towards -z) from the stall axis. */
export const LANE_OFFSET = 70;
/** Position, along x, of the centre of each stall. */
export const STALL_X = [120, 170, 220, 270] as const;
/** A car is seen by the photocell while it overlaps the line of a barrier. */
export const PHOTOCELL_HALF_LENGTH = CAR_LENGTH / 2;
/** Distance between a barrier and the front of a car waiting for it to open. */
const WAITING_MARGIN = 8;
/** Length of the zone, from the stop line, where a waiting car is seen by a presence sensor. */
const DETECTOR_LENGTH = 18;
/** A car pulling out of its stall waits here, before it reaches the exit lane. */
const JOIN_HOLD_S = LANE_OFFSET - CAR_LENGTH / 2 - CAR_WIDTH / 2 - 2;
/** A car pulling out only joins the exit lane when no car is nearer than this along it. */
const JOIN_CLEARANCE = 2.5 * CAR_LENGTH;

export type Gate = "entry" | "exit";

/**
 * `arriving`: from the start of the street to the stall. `parked`: stopped in its stall.
 * `leaving`: from the stall to the end of the street.
 */
export type CarPhase = "arriving" | "parked" | "leaving";

export interface Car {
	id: number;
	phase: CarPhase;
	/** Stall of the car; null for a car still in the street, which has none yet. */
	stall: number | null;
	/** Distance covered along the path of the car (see `carPose`). */
	s: number;
}

export interface ParkingState {
	/** Opening of each barrier arm, from 0 (closed) to `BARRIER_TRAVEL`. */
	barriers: Record<Gate, number>;
	cars: Car[];
	nextCarId: number;
	/** Commands the PLC gives to the barriers in the last cycle. */
	commands: Record<Gate, boolean>;
	/** The "full" lamp as commanded by the PLC. */
	full: boolean;
	/** Value of the places variable; null while it is not bound or unknown. */
	places: number | null;
}

export type ParkingInteraction = { type: "arrival" } | { type: "departure" };

export interface CarPose {
	x: number;
	z: number;
	/** Unit vector of the direction of travel in the plane (x east, z towards the viewer). */
	dirX: number;
	dirZ: number;
}

/** Length of the path from the start of the street to a stall. */
export function arrivalLength(stall: number): number {
	return STREET_LENGTH + STALL_X[stall] + LANE_OFFSET;
}

/** Length of the path from a stall to the end of the street. */
export function departureLength(stall: number): number {
	return LANE_OFFSET + STALL_X[stall] + STREET_LENGTH;
}

/** Distance along the arrival path at which the car stops before the entry barrier. */
const ENTRY_STOP_S = STREET_LENGTH - CAR_LENGTH / 2 - WAITING_MARGIN;

/** Distance along the departure path at which the car stops before the exit barrier. */
function exitStopS(stall: number): number {
	return LANE_OFFSET + STALL_X[stall] - CAR_LENGTH / 2 - WAITING_MARGIN;
}

/**
 * Place and heading of a car. A car arrives along the entry lane, then turns into its stall;
 * it leaves by the opposite side of the stall, onto the exit lane. A car without a stall
 * keeps to the entry lane.
 */
export function carPose(car: Car): CarPose {
	if (car.phase === "leaving" && car.stall !== null) {
		const stallX = STALL_X[car.stall];
		if (car.s <= LANE_OFFSET)
			return { x: stallX, z: -car.s, dirX: 0, dirZ: -1 };
		return {
			x: stallX - (car.s - LANE_OFFSET),
			z: -LANE_OFFSET,
			dirX: -1,
			dirZ: 0,
		};
	}
	const alongLane = { x: car.s - STREET_LENGTH, z: LANE_OFFSET };
	if (car.stall === null) return { ...alongLane, dirX: 1, dirZ: 0 };
	const turnS = STREET_LENGTH + STALL_X[car.stall];
	if (car.s <= turnS) return { ...alongLane, dirX: 1, dirZ: 0 };
	return {
		x: STALL_X[car.stall],
		z: LANE_OFFSET - (car.s - turnS),
		dirX: 0,
		dirZ: -1,
	};
}

/** Rotation around the vertical axis of a car whose length lies along z. */
export function carHeading(pose: CarPose): number {
	return Math.atan2(pose.dirX, pose.dirZ);
}

/** Barrier under which the car stands, if any. */
function gateUnder(car: Car): Gate | null {
	if (car.phase === "parked") return null;
	if (Math.abs(carPose(car).x) > PHOTOCELL_HALF_LENGTH) return null;
	return car.phase === "arriving" ? "entry" : "exit";
}

/** A car is under a barrier: the photocell sees it. */
export function isPhotocellBlocked(state: ParkingState): boolean {
	return state.cars.some((car) => gateUnder(car) !== null);
}

/** A car is stopped in front of the barrier: the presence sensor of that gate sees it. */
export function isCarWaiting(state: ParkingState, gate: Gate): boolean {
	return state.cars.some((car) => {
		if (gate === "entry") {
			return (
				car.phase === "arriving" &&
				car.s >= ENTRY_STOP_S - 3 &&
				car.s <= ENTRY_STOP_S + DETECTOR_LENGTH
			);
		}
		if (car.phase !== "leaving") return false;
		const stop = exitStopS(car.stall!);
		return car.s >= stop - 3 && car.s <= stop + DETECTOR_LENGTH;
	});
}

/** Stalls where a car is parked or is still pulling out of. */
function occupiedStalls(cars: Car[]): Set<number> {
	const occupied = new Set<number>();
	for (const car of cars) {
		if (car.stall === null) continue;
		if (car.phase !== "leaving" || car.s < CAR_LENGTH + MIN_GAP) {
			occupied.add(car.stall);
		}
	}
	return occupied;
}

function firstFreeStall(cars: Car[]): number | null {
	const occupied = occupiedStalls(cars);
	for (let stall = 0; stall < PARKING_CAPACITY; stall++) {
		if (!occupied.has(stall)) return stall;
	}
	return null;
}

/** Distance of the car right in front of `car`, or Infinity when the way is clear. */
function gapAhead(car: Car, cars: Car[]): number {
	const pose = carPose(car);
	let gap = Infinity;
	for (const other of cars) {
		if (other.id === car.id) continue;
		const target = carPose(other);
		const dx = target.x - pose.x;
		const dz = target.z - pose.z;
		const forward = dx * pose.dirX + dz * pose.dirZ;
		const lateral = Math.abs(dx * pose.dirZ - dz * pose.dirX);
		if (forward > 0 && lateral < LANE_TOLERANCE) gap = Math.min(gap, forward);
	}
	return gap;
}

/** Distance the car can still cover before it touches the car in front of it. */
function freeRoom(car: Car, cars: Car[]): number {
	return Math.max(0, gapAhead(car, cars) - CAR_LENGTH - MIN_GAP);
}

/** A car pulling out of a stall may join the exit lane when no car on it is close to the junction. */
function canJoinExitLane(car: Car, cars: Car[]): boolean {
	const stallX = STALL_X[car.stall!];
	return !cars.some(
		(other) =>
			other.id !== car.id &&
			other.phase === "leaving" &&
			other.s > JOIN_HOLD_S &&
			Math.abs(carPose(other).x - stallX) < JOIN_CLEARANCE,
	);
}

function moveCar(
	car: Car,
	cars: Car[],
	distance: number,
	barriers: Record<Gate, number>,
): Car {
	if (car.phase === "parked") return car;
	const room = Math.min(distance, freeRoom(car, cars));

	if (car.phase === "arriving") {
		let stall = car.stall;
		let limit = Infinity;
		if (stall === null) {
			if (car.s >= ENTRY_STOP_S - 1e-6 && barriers.entry >= BARRIER_CLEAR) {
				stall = firstFreeStall(cars);
			}
			if (stall === null) limit = ENTRY_STOP_S;
		}
		const s = Math.min(car.s + room, limit);
		if (stall !== null && s >= arrivalLength(stall)) {
			return { ...car, stall, phase: "parked", s: arrivalLength(stall) };
		}
		return { ...car, stall, s };
	}

	const stop = exitStopS(car.stall!);
	let limit = Infinity;
	if (barriers.exit < BARRIER_CLEAR && car.s <= stop + 1e-6) limit = stop;
	if (car.s <= JOIN_HOLD_S && !canJoinExitLane(car, cars)) {
		limit = Math.min(limit, JOIN_HOLD_S);
	}
	return { ...car, s: Math.min(car.s + room, limit) };
}

/** Moves a barrier arm towards its command; a closing arm stops on a car standing under it. */
function moveBarrier(
	position: number,
	command: boolean,
	blocked: boolean,
	dtMs: number,
): number {
	const travel = BARRIER_SPEED_PER_MS * dtMs;
	if (command) return clamp(position + travel, 0, BARRIER_TRAVEL);
	if (blocked) return position;
	return clamp(position - travel, 0, BARRIER_TRAVEL);
}

const ParkingModel: SceneModel<ParkingState, ParkingInteraction> = {
	createState() {
		return {
			barriers: { entry: 0, exit: 0 },
			cars: [],
			nextCarId: 0,
			commands: { entry: false, exit: false },
			full: false,
			places: null,
		};
	},

	step(state, dtMs, actuators) {
		const commands = {
			entry: actuators.barrierEntry === true,
			exit: actuators.barrierExit === true,
		};
		const occupiedGates = new Set(state.cars.map(gateUnder));
		const barriers = {
			entry: moveBarrier(
				state.barriers.entry,
				commands.entry,
				occupiedGates.has("entry"),
				dtMs,
			),
			exit: moveBarrier(
				state.barriers.exit,
				commands.exit,
				occupiedGates.has("exit"),
				dtMs,
			),
		};

		const distance = CAR_SPEED_PER_MS * dtMs;
		let cars = state.cars;
		for (const { id } of state.cars) {
			const car = cars.find((candidate) => candidate.id === id)!;
			const moved = moveCar(car, cars, distance, barriers);
			cars = cars.map((candidate) => (candidate.id === id ? moved : candidate));
		}
		cars = cars.filter(
			(car) => car.phase !== "leaving" || car.s < departureLength(car.stall!),
		);

		return {
			barriers,
			cars,
			nextCarId: state.nextCarId,
			commands,
			full: actuators.full === true,
			places: typeof actuators.places === "number" ? actuators.places : null,
		};
	},

	readSensors(state): ScenePointValues {
		return {
			entryDetector: isCarWaiting(state, "entry"),
			exitDetector: isCarWaiting(state, "exit"),
			photocell: isPhotocellBlocked(state),
		};
	},

	applyInteraction(state, interaction) {
		if (interaction.type === "arrival") {
			const startIsClear = !state.cars.some(
				(car) =>
					car.phase === "arriving" &&
					car.stall === null &&
					car.s < CAR_LENGTH + MIN_GAP,
			);
			if (state.cars.length >= MAX_CARS || !startIsClear) return state;
			const car: Car = {
				id: state.nextCarId,
				phase: "arriving",
				stall: null,
				s: 0,
			};
			return { ...state, cars: [...state.cars, car], nextCarId: car.id + 1 };
		}

		const leaver = state.cars.find((car) => car.phase === "parked");
		if (!leaver) return state;
		return {
			...state,
			cars: state.cars.map((car) =>
				car.id === leaver.id ? { ...car, phase: "leaving", s: 0 } : car,
			),
		};
	},
};

export default ParkingModel;
