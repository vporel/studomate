import labelZoom from "./label-zoom";

describe("labelZoom", () => {
	it("is 1 where the distance factor spans the vertical field of view", () => {
		const fov = 50;
		const distance = 9 / (2 * Math.tan((fov * Math.PI) / 360));
		expect(labelZoom(distance, fov, 9)).toBeCloseTo(1);
	});

	it("doubles when the camera is twice as close", () => {
		expect(labelZoom(5, 50, 9)).toBeCloseTo(2 * labelZoom(10, 50, 9));
	});

	it("falls back to 1 when the label is at the camera position", () => {
		expect(labelZoom(0, 50, 9)).toBe(1);
	});
});
