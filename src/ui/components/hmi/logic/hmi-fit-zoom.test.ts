import getHmiFitZoom from "./hmi-fit-zoom";

const fit = (availableWidth: number, availableHeight: number, minZoom = 0.5) =>
	getHmiFitZoom({ availableWidth, availableHeight, minZoom });

describe("getHmiFitZoom", () => {
	it("never zooms above 100 %", () => {
		expect(fit(3000, 2000)).toBe(1);
	});

	it("follows the width when it is the tighter side", () => {
		expect(fit(750, 2000)).toBeCloseTo(0.75);
	});

	it("follows the height when it is the tighter side", () => {
		expect(fit(2000, 320)).toBeCloseTo(0.5);
		expect(fit(2000, 416)).toBeCloseTo(0.65);
	});

	it("never goes under the floor", () => {
		expect(fit(100, 100)).toBe(0.5);
		expect(fit(-20, -20)).toBe(0.5);
		expect(fit(100, 100, 0.3)).toBe(0.3);
	});
});
