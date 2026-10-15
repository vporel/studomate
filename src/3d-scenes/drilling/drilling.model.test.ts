import DrillingModel, {
	DRILLING_DURATION_MS,
	DRILL_SPEED_PER_MS,
	DRILL_TRAVEL,
	SPINDLE_SPEED_PER_MS,
	type DrillingState,
} from "./drilling.model";

function run(
	state: DrillingState,
	durationMs: number,
	actuators: Record<string, boolean>,
): DrillingState {
	let current = state;
	for (let elapsed = 0; elapsed < durationMs; elapsed += 10) {
		current = DrillingModel.step(current, 10, actuators);
	}
	return current;
}

describe("drilling model", () => {
	it("starts with the drill at the top limit", () => {
		const state = DrillingModel.createState();
		expect(state).toEqual({ position: 0, spindleAngle: 0, holeProgress: 0 });
		expect(DrillingModel.readSensors(state)).toEqual({
			high: true,
			low: false,
			drillPosition: 0,
		});
	});

	describe("drill", () => {
		it("goes down at its speed while `down` is commanded", () => {
			const state = DrillingModel.step(DrillingModel.createState(), 100, {
				down: true,
			});
			expect(state.position).toBeCloseTo(100 * DRILL_SPEED_PER_MS);
		});

		it("stops at the bottom limit and raises the low sensor", () => {
			const state = run(DrillingModel.createState(), 10000, { down: true });
			expect(state.position).toBe(DRILL_TRAVEL);
			expect(DrillingModel.readSensors(state)).toMatchObject({
				high: false,
				low: true,
				drillPosition: DRILL_TRAVEL,
			});
		});

		it("rises back up to the top limit, never above", () => {
			const bottom = run(DrillingModel.createState(), 10000, { down: true });
			const risen = run(bottom, 500, { up: true });
			expect(risen.position).toBeCloseTo(
				DRILL_TRAVEL - 500 * DRILL_SPEED_PER_MS,
			);
			const top = run(risen, 10000, { up: true });
			expect(top.position).toBe(0);
			expect(DrillingModel.readSensors(top)).toMatchObject({ high: true });
		});

		it("does not move without a command, nor with both commands at once", () => {
			const mid = run(DrillingModel.createState(), 1000, { down: true });
			expect(run(mid, 1000, {}).position).toBe(mid.position);
			expect(run(mid, 1000, { down: true, up: true }).position).toBeCloseTo(
				mid.position,
			);
		});

		it("has neither limit sensor active between the two limits", () => {
			const mid = run(DrillingModel.createState(), 1000, { down: true });
			expect(DrillingModel.readSensors(mid)).toMatchObject({
				high: false,
				low: false,
			});
		});

		it("reports the position as a rounded integer", () => {
			const state = DrillingModel.step(DrillingModel.createState(), 77, {
				down: true,
			});
			expect(DrillingModel.readSensors(state).drillPosition).toBe(
				Math.round(77 * DRILL_SPEED_PER_MS),
			);
		});
	});

	describe("spindle", () => {
		it("turns only while `spindle` is commanded", () => {
			const turning = DrillingModel.step(DrillingModel.createState(), 100, {
				spindle: true,
			});
			expect(turning.spindleAngle).toBeCloseTo(100 * SPINDLE_SPEED_PER_MS);
			expect(DrillingModel.step(turning, 100, {}).spindleAngle).toBe(
				turning.spindleAngle,
			);
		});

		it("does not drill while the drill is not at the bottom", () => {
			const state = run(DrillingModel.createState(), 5000, { spindle: true });
			expect(state.holeProgress).toBe(0);
		});

		it("does not drill at the bottom with the spindle stopped", () => {
			const bottom = run(DrillingModel.createState(), 10000, { down: true });
			expect(run(bottom, 5000, {}).holeProgress).toBe(0);
		});

		it("completes the hole after the drilling duration at the bottom", () => {
			const bottom = run(DrillingModel.createState(), 10000, { down: true });
			const half = run(bottom, DRILLING_DURATION_MS / 2, { spindle: true });
			expect(half.holeProgress).toBeCloseTo(0.5, 1);
			const done = run(bottom, DRILLING_DURATION_MS * 2, { spindle: true });
			expect(done.holeProgress).toBe(1);
		});

		it("keeps the hole once drilled", () => {
			const bottom = run(DrillingModel.createState(), 10000, { down: true });
			const done = run(bottom, DRILLING_DURATION_MS * 2, { spindle: true });
			expect(run(done, 10000, { up: true }).holeProgress).toBe(1);
		});
	});

	it("ignores interactions", () => {
		const state = DrillingModel.createState();
		expect(DrillingModel.applyInteraction(state, undefined as never)).toBe(
			state,
		);
	});

	it("does not mutate the previous state", () => {
		const state = DrillingModel.createState();
		const snapshot = structuredClone(state);
		DrillingModel.step(state, 100, { down: true, spindle: true });
		expect(state).toEqual(snapshot);
	});
});
