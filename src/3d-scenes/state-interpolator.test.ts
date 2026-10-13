import StateInterpolator from "./state-interpolator";

const lerp = (a: number, b: number, r: number) => a + (b - a) * r;

describe("StateInterpolator", () => {
	it("returns null before any state", () => {
		expect(new StateInterpolator(lerp).sample(0)).toBeNull();
	});

	it("returns the first state as is", () => {
		const i = new StateInterpolator(lerp);
		i.push({ simTimeMs: 0, state: 4 }, 1000);
		expect(i.sample(1500)).toBe(4);
	});

	it("blends from the previous to the latest state over one cycle", () => {
		const i = new StateInterpolator(lerp);
		i.push({ simTimeMs: 0, state: 0 }, 1000);
		i.push({ simTimeMs: 100, state: 10 }, 1100);
		expect(i.sample(1100)).toBe(0);
		expect(i.sample(1150)).toBe(5);
		expect(i.sample(1200)).toBe(10);
	});

	it("holds the latest state when the next one is late", () => {
		const i = new StateInterpolator(lerp);
		i.push({ simTimeMs: 0, state: 0 }, 1000);
		i.push({ simTimeMs: 100, state: 10 }, 1100);
		expect(i.sample(5000)).toBe(10);
	});

	it("restarts without blending when simulated time goes back", () => {
		const i = new StateInterpolator(lerp);
		i.push({ simTimeMs: 0, state: 0 }, 1000);
		i.push({ simTimeMs: 500, state: 50 }, 1500);
		i.push({ simTimeMs: 0, state: 0 }, 2000);
		expect(i.sample(2100)).toBe(0);
	});

	it("ignores a zero simulated-time span", () => {
		const i = new StateInterpolator(lerp);
		i.push({ simTimeMs: 100, state: 1 }, 1000);
		i.push({ simTimeMs: 100, state: 2 }, 1010);
		expect(i.sample(1020)).toBe(2);
	});
});
