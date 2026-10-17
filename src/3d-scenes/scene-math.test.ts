import { clamp, mix } from "@/3d-scenes/scene-math";

describe("mix", () => {
	it("returns the bounds at ratio 0 and 1", () => {
		expect(mix(10, 20, 0)).toBe(10);
		expect(mix(10, 20, 1)).toBe(20);
	});

	it("returns the midpoint at ratio 0.5", () => {
		expect(mix(10, 20, 0.5)).toBe(15);
	});

	it("extrapolates outside [0, 1]", () => {
		expect(mix(10, 20, 2)).toBe(30);
		expect(mix(10, 20, -1)).toBe(0);
	});
});

describe("clamp", () => {
	it("raises a value below the minimum", () => {
		expect(clamp(-5, 0, 10)).toBe(0);
	});

	it("keeps a value inside the range", () => {
		expect(clamp(5, 0, 10)).toBe(5);
	});

	it("lowers a value above the maximum", () => {
		expect(clamp(15, 0, 10)).toBe(10);
	});

	it("keeps values exactly at the bounds", () => {
		expect(clamp(0, 0, 10)).toBe(0);
		expect(clamp(10, 0, 10)).toBe(10);
	});
});
