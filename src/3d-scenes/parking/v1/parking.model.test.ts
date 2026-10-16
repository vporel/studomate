import ParkingModel, {
	BARRIER_CLEAR,
	BARRIER_TRAVEL,
	CAR_LENGTH,
	CAR_WIDTH,
	type Car,
	MAX_CARS,
	PARKING_CAPACITY,
	STALL_X,
	STREET_LENGTH,
	carPose,
	isCarWaiting,
	isPhotocellBlocked,
	type ParkingInteraction,
	type ParkingState,
} from "./parking.model";

function run(
	state: ParkingState,
	durationMs: number,
	actuators: Record<string, boolean | number> = {},
): ParkingState {
	let current = state;
	for (let elapsed = 0; elapsed < durationMs; elapsed += 10) {
		current = ParkingModel.step(current, 10, actuators);
	}
	return current;
}

const apply = (state: ParkingState, interaction: ParkingInteraction) =>
	ParkingModel.applyInteraction(state, interaction);
const arrive = (state: ParkingState, times = 1) => {
	for (let i = 0; i < times; i++) {
		state = apply(run(state, 700), { type: "arrival" });
	}
	return state;
};
const depart = (state: ParkingState) => apply(state, { type: "departure" });

const OPEN_ENTRY = { barrierEntry: true };
const OPEN_BOTH = { barrierEntry: true, barrierExit: true };

/** Parks `count` cars, the entry barrier open all the time. */
function fill(count: number): ParkingState {
	let state = ParkingModel.createState();
	for (let i = 0; i < count; i++) {
		state = run(apply(state, { type: "arrival" }), 14000, OPEN_ENTRY);
	}
	return run(state, 1000);
}

/** Two cars occupy the same ground: their axis-aligned bodies intersect. */
const overlap = (a: Car, b: Car) => {
	const half = (car: Car) => {
		const pose = carPose(car);
		const alongX = pose.dirX !== 0;
		return {
			x: pose.x,
			z: pose.z,
			hx: (alongX ? CAR_LENGTH : CAR_WIDTH) / 2,
			hz: (alongX ? CAR_WIDTH : CAR_LENGTH) / 2,
		};
	};
	const pa = half(a);
	const pb = half(b);
	return (
		Math.abs(pa.x - pb.x) < pa.hx + pb.hx - 0.01 &&
		Math.abs(pa.z - pb.z) < pa.hz + pb.hz - 0.01
	);
};
const anyOverlap = (state: ParkingState) =>
	state.cars.some((a, i) => state.cars.slice(i + 1).some((b) => overlap(a, b)));

describe("parking model", () => {
	it("starts empty, barriers closed, with no sensor active", () => {
		const state = ParkingModel.createState();
		expect(state).toMatchObject({
			barriers: { entry: 0, exit: 0 },
			cars: [],
		});
		expect(ParkingModel.readSensors(state)).toEqual({
			entryDetector: false,
			exitDetector: false,
			photocell: false,
		});
	});

	describe("barriers", () => {
		it("each opens on its own command, within its travel, and closes otherwise", () => {
			const opened = run(ParkingModel.createState(), 3000, {
				barrierExit: true,
			});
			expect(opened.barriers).toEqual({ entry: 0, exit: BARRIER_TRAVEL });
			expect(run(opened, 3000).barriers.exit).toBe(0);
		});

		it("does not close on a car standing under it", () => {
			let state = run(
				apply(ParkingModel.createState(), { type: "arrival" }),
				3000,
				OPEN_ENTRY,
			);
			while (!isPhotocellBlocked(state)) state = run(state, 10, OPEN_ENTRY);
			const stopped = run(state, 100);
			expect(stopped.barriers.entry).toBeGreaterThanOrEqual(BARRIER_CLEAR);
			expect(isPhotocellBlocked(stopped)).toBe(true);
		});
	});

	describe("arrivals", () => {
		it("sends a car to the entry barrier on each arrival", () => {
			const state = apply(ParkingModel.createState(), { type: "arrival" });
			expect(state.cars).toHaveLength(1);
			expect(state.cars[0]).toMatchObject({ phase: "arriving", stall: null });
			expect(carPose(state.cars[0]).x).toBe(-STREET_LENGTH);
		});

		it("makes the car wait before the closed barrier: detector on, photocell off", () => {
			const waiting = run(
				apply(ParkingModel.createState(), { type: "arrival" }),
				12000,
			);
			expect(carPose(waiting.cars[0]).x).toBeLessThan(0);
			expect(ParkingModel.readSensors(waiting)).toMatchObject({
				entryDetector: true,
				photocell: false,
			});
		});

		it("lets the car through an open barrier, trips the photocell, then parks it", () => {
			let state = apply(ParkingModel.createState(), { type: "arrival" });
			let tripped = false;
			for (let i = 0; i < 2000; i++) {
				state = ParkingModel.step(state, 10, OPEN_ENTRY);
				tripped ||= ParkingModel.readSensors(state).photocell === true;
			}
			expect(tripped).toBe(true);
			expect(state.cars[0]).toMatchObject({ phase: "parked", stall: 0 });
			expect(carPose(state.cars[0])).toMatchObject({ x: STALL_X[0], z: 0 });
			expect(ParkingModel.readSensors(state).entryDetector).toBe(false);
		});

		it("does not let a car through before the barrier is open enough", () => {
			let state = run(
				apply(ParkingModel.createState(), { type: "arrival" }),
				12000,
			);
			const x = carPose(state.cars[0]).x;
			state = run(state, 100, OPEN_ENTRY);
			expect(state.barriers.entry).toBeLessThan(BARRIER_CLEAR);
			expect(carPose(state.cars[0]).x).toBeCloseTo(x, 5);
		});

		it("lines up the cars, one detected at the barrier, without overlap", () => {
			const state = run(arrive(ParkingModel.createState(), 5), 15000);
			expect(state.cars).toHaveLength(5);
			expect(isCarWaiting(state, "entry")).toBe(true);
			expect(anyOverlap(state)).toBe(false);
			const xs = state.cars.map((c) => carPose(c).x);
			expect(Math.max(...xs)).toBeLessThan(0);
		});

		it("never holds more than MAX_CARS cars", () => {
			const state = arrive(ParkingModel.createState(), MAX_CARS + 3);
			expect(state.cars).toHaveLength(MAX_CARS);
		});

		it("serves the queue in turn when the barrier stays open, parking successive stalls", () => {
			let state = run(arrive(ParkingModel.createState(), 3), 40000, OPEN_ENTRY);
			expect(state.cars.map((c) => c.stall)).toEqual([0, 1, 2]);
			expect(state.cars.every((c) => c.phase === "parked")).toBe(true);
			state = run(state, 100);
			expect(anyOverlap(state)).toBe(false);
		});

		it("keeps the cars out while every stall is taken, two of them blocked in the queue", () => {
			const state = run(arrive(fill(PARKING_CAPACITY), 2), 20000, OPEN_ENTRY);
			expect(state.cars).toHaveLength(MAX_CARS);
			const outside = state.cars.filter((c) => c.phase === "arriving");
			expect(outside).toHaveLength(2);
			expect(outside.every((c) => c.stall === null)).toBe(true);
			expect(outside.every((c) => carPose(c).x < 0)).toBe(true);
			expect(isCarWaiting(state, "entry")).toBe(true);
		});
	});

	describe("departures", () => {
		it("does nothing when no car is parked", () => {
			const state = depart(ParkingModel.createState());
			expect(state.cars).toEqual([]);
		});

		it("sends the oldest parked car to the exit barrier, where it waits and is detected", () => {
			let state = depart(fill(2));
			expect(state.cars.find((c) => c.stall === 0)?.phase).toBe("leaving");
			state = run(state, 15000);
			const leaver = state.cars.find((c) => c.stall === 0)!;
			expect(carPose(leaver).x).toBeGreaterThan(0);
			expect(ParkingModel.readSensors(state)).toMatchObject({
				exitDetector: true,
				photocell: false,
			});
		});

		it("removes the car once it has driven out through the open exit barrier", () => {
			const state = run(depart(fill(2)), 20000, { barrierExit: true });
			expect(state.cars).toHaveLength(1);
			expect(state.cars[0].stall).toBe(1);
		});

		it("does not let a car out through the entry barrier", () => {
			const state = run(depart(fill(2)), 20000, OPEN_ENTRY);
			expect(state.cars).toHaveLength(2);
			expect(ParkingModel.readSensors(state).exitDetector).toBe(true);
		});

		it("lines up several leaving cars without overlap and lets them all out", () => {
			let state = fill(PARKING_CAPACITY);
			for (let i = 0; i < PARKING_CAPACITY; i++) {
				state = depart(run(state, 300));
			}
			let overlapped = false;
			for (let i = 0; i < 4000; i++) {
				state = ParkingModel.step(state, 10, i > 1500 ? OPEN_BOTH : {});
				overlapped ||= anyOverlap(state);
			}
			expect(overlapped).toBe(false);
			expect(state.cars).toHaveLength(0);
		});

		it("frees the stall for the next arrival", () => {
			let state = run(depart(fill(PARKING_CAPACITY)), 20000, OPEN_BOTH);
			state = run(apply(state, { type: "arrival" }), 20000, OPEN_BOTH);
			expect(state.cars).toHaveLength(PARKING_CAPACITY);
			expect(state.cars.find((c) => c.stall === 0)?.phase).toBe("parked");
		});

		it("serves an entering and a leaving car through their own barrier at the same time", () => {
			let state = apply(depart(fill(2)), { type: "arrival" });
			state = run(state, 25000, OPEN_BOTH);
			expect(state.cars.map((c) => c.phase)).toEqual(["parked", "parked"]);
			expect(state.cars.map((c) => c.stall).sort()).toEqual([0, 1]);
		});
	});

	describe("display", () => {
		it("takes the lamp and the places counter from the PLC", () => {
			const state = ParkingModel.step(ParkingModel.createState(), 10, {
				full: true,
				places: 3,
			});
			expect(state).toMatchObject({ full: true, places: 3 });
		});

		it("shows no counter while the variable is unknown", () => {
			const state = ParkingModel.step(ParkingModel.createState(), 10, {});
			expect(state).toMatchObject({ full: false, places: null });
		});
	});

	it("never mutates the state it is given", () => {
		const state = arrive(ParkingModel.createState(), 2);
		const snapshot = structuredClone(state);
		run(state, 500, OPEN_BOTH);
		expect(state).toEqual(snapshot);
	});
});
