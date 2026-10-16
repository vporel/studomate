import interpolateCartonSorting from "./carton-sorting.interpolation";
import CartonSortingModel, {
	type CartonSortingState,
} from "./carton-sorting.model";

const base = CartonSortingModel.createState();

function state(patch: Partial<CartonSortingState>): CartonSortingState {
	return { ...base, ...patch };
}

describe("interpolateCartonSorting", () => {
	it("blends the carton and the cylinders", () => {
		const from = state({ cartonPos: 100, cylinders: { p1: 0, p2: 0, p3: 0 } });
		const to = state({ cartonPos: 200, cylinders: { p1: 60, p2: 0, p3: 0 } });
		const mid = interpolateCartonSorting(from, to, 0.5);
		expect(mid.cartonPos).toBe(150);
		expect(mid.cylinders.p1).toBe(30);
	});

	it("takes the discrete fields from the latest state", () => {
		const from = state({ cartonHigh: false, cartonPresent: false });
		const to = state({
			cartonHigh: true,
			cartonPresent: true,
			cartonExists: true,
		});
		const mid = interpolateCartonSorting(from, to, 0.2);
		expect(mid).toMatchObject({
			cartonHigh: true,
			cartonPresent: true,
			cartonExists: true,
		});
	});

	it("shows a respawned carton at its new place at once", () => {
		const from = state({ cartonPos: 516, cartonY: 192, cartonXExtra: 120 });
		const to = state({ cartonPos: 0, cartonY: 0, cartonXExtra: 0 });
		const mid = interpolateCartonSorting(from, to, 0.3);
		expect(mid).toMatchObject({ cartonPos: 0, cartonY: 0, cartonXExtra: 0 });
	});

	it("returns the endpoints at ratio 0 and 1", () => {
		const from = state({ cartonPos: 10 });
		const to = state({ cartonPos: 30 });
		expect(interpolateCartonSorting(from, to, 0).cartonPos).toBe(10);
		expect(interpolateCartonSorting(from, to, 1).cartonPos).toBe(30);
	});

	describe("sorted cartons", () => {
		const low = (x: number, y = 192) => ({ y, x, tall: false });

		it("slides a carton that is being shoved along its output", () => {
			const from = state({ sortedCartons: [low(70)] });
			const to = state({ sortedCartons: [low(110)] });
			expect(interpolateCartonSorting(from, to, 0.5).sortedCartons).toEqual([
				low(90),
			]);
		});

		it("shows a carton that just joined at its place", () => {
			const from = state({ sortedCartons: [low(140)] });
			const to = state({ sortedCartons: [low(140), low(70)] });
			expect(interpolateCartonSorting(from, to, 0.5).sortedCartons).toEqual([
				low(140),
				low(70),
			]);
		});

		it("does not slide a carton that took the index of a dropped one", () => {
			const from = state({ sortedCartons: [low(205), low(135)] });
			const to = state({ sortedCartons: [low(140)] });
			expect(interpolateCartonSorting(from, to, 0.5).sortedCartons).toEqual([
				low(140),
			]);
		});
	});
});
