import { bottom, centerX, centerY, right } from "./grafcet-geometry";

const box = { position: { x: 10, y: 20 }, size: { width: 100, height: 40 } };

describe("grafcet-geometry", () => {
	it("gives the centers of a box at its own position", () => {
		expect(centerX(box)).toBe(60);
		expect(centerY(box)).toBe(40);
	});

	it("gives the centers of a box at another position", () => {
		expect(centerX(box, { x: 0, y: 0 })).toBe(50);
		expect(centerY(box, { x: 0, y: 0 })).toBe(20);
	});

	it("gives the right and bottom edges of a box", () => {
		expect(right(box)).toBe(110);
		expect(bottom(box)).toBe(60);
	});
});
