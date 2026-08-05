import { getLastMousePosition, setLastMousePosition } from "./mouse-position";

describe("mouse-position", () => {
	it("defaults to the origin", () => {
		expect(getLastMousePosition()).toEqual({ x: 0, y: 0 });
	});

	it("returns the last position set", () => {
		setLastMousePosition(12, 34);
		expect(getLastMousePosition()).toEqual({ x: 12, y: 34 });
	});
});
