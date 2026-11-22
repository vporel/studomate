import getEdgeArrowPolygon from "./grafcet-edge-arrow";

describe("getEdgeArrowPolygon", () => {
	it("returns null for a link going down", () => {
		expect(
			getEdgeArrowPolygon([
				[100, 0],
				[100, 100],
			]),
		).toBeNull();
	});

	it("returns null for a horizontal link", () => {
		expect(
			getEdgeArrowPolygon([
				[0, 50],
				[100, 50],
			]),
		).toBeNull();
	});

	it("returns null for fewer than two vertices", () => {
		expect(getEdgeArrowPolygon([])).toBeNull();
		expect(getEdgeArrowPolygon([[0, 0]])).toBeNull();
	});

	it("points up in the middle of a straight upward link", () => {
		expect(
			getEdgeArrowPolygon([
				[100, 100],
				[100, 0],
			]),
		).toEqual([
			[100, 45],
			[104, 55],
			[96, 55],
		]);
	});

	it("sits on the upward segment of a return loop", () => {
		// leaves the bottom transition, goes left, up, then right into the top step
		const polygon = getEdgeArrowPolygon([
			[200, 300],
			[200, 320],
			[100, 320],
			[100, 0],
			[200, 0],
			[200, 20],
		]);

		expect(polygon).not.toBeNull();
		expect(polygon![0]).toEqual([100, 155]);
		expect(polygon![1][0]).toBeCloseTo(104);
		expect(polygon![2][0]).toBeCloseTo(96);
	});

	it("picks the longest upward segment", () => {
		const polygon = getEdgeArrowPolygon([
			[0, 100],
			[0, 60],
			[50, 60],
			[50, -100],
		]);

		expect(polygon![0][0]).toBe(50);
		expect(polygon![0][1]).toBe(-25);
	});

	it("ignores a segment shorter than the arrow", () => {
		expect(
			getEdgeArrowPolygon([
				[0, 10],
				[0, 5],
			]),
		).toBeNull();
	});

	it("ignores a mostly horizontal segment that slightly rises", () => {
		expect(
			getEdgeArrowPolygon([
				[0, 100],
				[100, 80],
			]),
		).toBeNull();
	});
});
