import interpolateCrossroads from "./crossroads.interpolation";
import CrossroadsModel, { type CrossroadsState } from "./crossroads.model";

const base = CrossroadsModel.createState();

function withCars(
	cars: { id: number; s: number }[],
	patch: Partial<CrossroadsState> = {},
): CrossroadsState {
	return {
		...base,
		...patch,
		lanes: {
			...base.lanes,
			NS1: cars.map((car) => ({ ...car, v: 0, committed: false })),
		},
	};
}

describe("interpolateCrossroads", () => {
	it("blends the position of a car present in both states", () => {
		const mid = interpolateCrossroads(
			withCars([{ id: 1, s: 100 }]),
			withCars([{ id: 1, s: 200 }]),
			0.5,
		);
		expect(mid.lanes.NS1[0].s).toBe(150);
	});

	it("matches cars by id when the front one left the plant", () => {
		const mid = interpolateCrossroads(
			withCars([
				{ id: 1, s: 700 },
				{ id: 2, s: 100 },
			]),
			withCars([{ id: 2, s: 140 }]),
			0.5,
		);
		expect(mid.lanes.NS1).toHaveLength(1);
		expect(mid.lanes.NS1[0].s).toBe(120);
	});

	it("shows a new car, or the cars after a reset, at their place at once", () => {
		const mid = interpolateCrossroads(
			withCars([{ id: 1, s: 400 }]),
			withCars([{ id: 9, s: 20 }]),
			0.3,
		);
		expect(mid.lanes.NS1[0].s).toBe(20);
	});

	it("takes the lights, crash and counters from the latest state", () => {
		const crash = { x: 1, z: 2, remainingMs: 100 };
		const mid = interpolateCrossroads(
			withCars([]),
			withCars([], { crash, accidents: 3 }),
			0.2,
		);
		expect(mid.crash).toEqual(crash);
		expect(mid.accidents).toBe(3);
	});
});
