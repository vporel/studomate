import ElevatorModel, {
	CABIN_SPEED_PER_MS,
	CABIN_TRAVEL,
	DOOR_HOLD_MS,
	DOOR_SPEED_PER_MS,
	DOOR_TRAVEL,
	FLOOR_POSITIONS,
	type ElevatorState,
} from "./elevator.model";

const idle = {};

function run(
	state: ElevatorState,
	durationMs: number,
	actuators: Record<string, boolean>,
): ElevatorState {
	let current = state;
	for (let elapsed = 0; elapsed < durationMs; elapsed += 10) {
		current = ElevatorModel.step(current, 10, actuators);
	}
	return current;
}

function openDoor(): ElevatorState {
	return run(ElevatorModel.createState(), 2500, { door: true });
}

describe("elevator model", () => {
	it("starts at the ground floor with the door closed", () => {
		const state = ElevatorModel.createState();
		expect(state).toMatchObject({ position: 0, doorPosition: 0 });
		expect(ElevatorModel.readSensors(state)).toEqual({
			floor0: true,
			floor1: false,
			floor2: false,
			doorOpen: false,
			cabinPosition: 0,
		});
	});

	describe("cabin", () => {
		it("rises at its speed while `up` is commanded", () => {
			const state = ElevatorModel.step(ElevatorModel.createState(), 100, {
				up: true,
			});
			expect(state.position).toBeCloseTo(100 * CABIN_SPEED_PER_MS);
		});

		it("goes back down while `down` is commanded, never below the ground floor", () => {
			const risen = run(ElevatorModel.createState(), 1000, { up: true });
			const lowered = run(risen, 300, { down: true });
			expect(lowered.position).toBeCloseTo(
				risen.position - 300 * CABIN_SPEED_PER_MS,
			);
			expect(run(lowered, 5000, { down: true }).position).toBe(0);
		});

		it("stops at the top floor", () => {
			const state = run(ElevatorModel.createState(), 10000, { up: true });
			expect(state.position).toBe(CABIN_TRAVEL);
		});

		it("holds its position without command, and when both commands are given", () => {
			const risen = run(ElevatorModel.createState(), 1000, { up: true });
			expect(run(risen, 500, idle).position).toBe(risen.position);
			expect(run(risen, 500, { up: true, down: true }).position).toBeCloseTo(
				risen.position,
			);
		});

		it("sees each floor sensor only near its floor", () => {
			const at = (floor: number) =>
				ElevatorModel.readSensors({
					...ElevatorModel.createState(),
					position: FLOOR_POSITIONS[floor],
				});
			expect(at(1)).toMatchObject({
				floor0: false,
				floor1: true,
				floor2: false,
			});
			expect(at(2)).toMatchObject({
				floor0: false,
				floor1: false,
				floor2: true,
			});
			const between = ElevatorModel.readSensors({
				...ElevatorModel.createState(),
				position: 50,
			});
			expect(between).toMatchObject({
				floor0: false,
				floor1: false,
				floor2: false,
			});
		});

		it("reports its position as an integer", () => {
			const sensors = ElevatorModel.readSensors({
				...ElevatorModel.createState(),
				position: 37.6,
			});
			expect(sensors.cabinPosition).toBe(38);
		});
	});

	describe("door", () => {
		it("opens at its speed while `door` is commanded, until fully open", () => {
			const partly = ElevatorModel.step(ElevatorModel.createState(), 100, {
				door: true,
			});
			expect(partly.doorPosition).toBeCloseTo(100 * DOOR_SPEED_PER_MS);
			expect(ElevatorModel.readSensors(partly).doorOpen).toBe(false);

			const open = openDoor();
			expect(open.doorPosition).toBe(DOOR_TRAVEL);
			expect(ElevatorModel.readSensors(open).doorOpen).toBe(true);
		});

		it("stays where it is while it was never held open long enough, even without command", () => {
			const partly = run(ElevatorModel.createState(), 500, { door: true });
			expect(run(partly, 1000, idle).doorPosition).toBe(partly.doorPosition);
		});

		it("cannot close before the hold time has elapsed since it was fully open", () => {
			const open = run(ElevatorModel.createState(), 2500, { door: true });
			const released = run(
				{ ...open, doorOpenMs: 0, doorHoldElapsed: false },
				DOOR_HOLD_MS - 100,
				idle,
			);
			expect(released.doorPosition).toBe(DOOR_TRAVEL);
			expect(ElevatorModel.readSensors(released).doorOpen).toBe(true);
		});

		it("closes once the hold time has elapsed and the command is released", () => {
			const open = run(
				{ ...ElevatorModel.createState(), doorPosition: DOOR_TRAVEL },
				DOOR_HOLD_MS + 100,
				idle,
			);
			expect(open.doorHoldElapsed).toBe(true);
			expect(open.doorPosition).toBeLessThan(DOOR_TRAVEL);

			const closed = run(open, 3000, idle);
			expect(closed.doorPosition).toBe(0);
			expect(closed.doorHoldElapsed).toBe(false);
			expect(closed.doorOpenMs).toBe(0);
		});

		it("stays open as long as the command is held", () => {
			const state = run(openDoor(), 5000, { door: true });
			expect(state.doorPosition).toBe(DOOR_TRAVEL);
		});

		it("reopens while closing when the command comes back, and can close again at once", () => {
			const closing = run(
				{ ...ElevatorModel.createState(), doorPosition: DOOR_TRAVEL },
				DOOR_HOLD_MS + 500,
				idle,
			);
			expect(closing.doorPosition).toBeLessThan(DOOR_TRAVEL);
			const reopened = run(closing, 1000, { door: true });
			expect(reopened.doorPosition).toBe(DOOR_TRAVEL);
			expect(run(reopened, 100, idle).doorPosition).toBeLessThan(DOOR_TRAVEL);
		});
	});

	it("does not change its state on an interaction", () => {
		const state = ElevatorModel.createState();
		expect(ElevatorModel.applyInteraction(state, undefined as never)).toBe(
			state,
		);
	});

	it("does not mutate the state it steps from", () => {
		const state = ElevatorModel.createState();
		const frozen = Object.freeze({ ...state });
		expect(() =>
			ElevatorModel.step(frozen, 10, { up: true, door: true }),
		).not.toThrow();
		expect(frozen).toEqual(state);
	});
});
