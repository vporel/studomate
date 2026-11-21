import { DrawOp } from "./draw-op";
import { bboxOfOps, frameScene, framePage } from "./scene-geometry";
import { estimateTextWidth } from "./text-layout";

describe("bboxOfOps", () => {
	it("returns an infinite empty box for no op", () => {
		const b = bboxOfOps([]);
		expect(Number.isFinite(b.minX)).toBe(false);
		expect(b.minX).toBe(Infinity);
		expect(b.maxX).toBe(-Infinity);
	});

	it("covers rect, line, polyline and circle", () => {
		const ops: DrawOp[] = [
			{ op: "rect", x: 10, y: 20, w: 30, h: 40 },
			{ op: "line", x1: -5, y1: 0, x2: 3, y2: 100 },
			{
				op: "polyline",
				points: [
					[200, 7],
					[1, 9],
				],
			},
			{ op: "circle", cx: 0, cy: -50, r: 10 },
		];
		expect(bboxOfOps(ops)).toEqual({
			minX: -10,
			minY: -60,
			maxX: 200,
			maxY: 100,
		});
	});

	it("reads coordinate pairs of a path", () => {
		const b = bboxOfOps([{ op: "path", d: "M10 20 L30.5 -4 C1 1 2 2 50 60" }]);
		expect(b).toEqual({ minX: 1, minY: -4, maxX: 50, maxY: 60 });
	});

	it("reads exponent notation in a path as a single number", () => {
		const b = bboxOfOps([{ op: "path", d: "M0 0 L1e-7 5" }]);
		expect(b.minX).toBe(0);
		expect(b.maxX).toBeCloseTo(0, 5);
		expect(b.maxY).toBe(5);
	});

	describe("text", () => {
		const text = (align?: "left" | "center" | "right"): DrawOp => ({
			op: "text",
			x: 100,
			y: 50,
			text: "Hello",
			fontSize: 10,
			align,
		});
		const width = estimateTextWidth("Hello", 10);

		it("extends to the right of x for left alignment", () => {
			const b = bboxOfOps([text("left")]);
			expect(b.minX).toBe(100);
			expect(b.maxX).toBeCloseTo(100 + width);
			expect(b.minY).toBe(40);
			expect(b.maxY).toBe(60);
		});

		it("defaults to left alignment", () => {
			expect(bboxOfOps([text()])).toEqual(bboxOfOps([text("left")]));
		});

		it("is centered on x for center alignment", () => {
			const b = bboxOfOps([text("center")]);
			expect(b.minX).toBeCloseTo(100 - width / 2);
			expect(b.maxX).toBeCloseTo(100 + width / 2);
		});

		it("ends at x for right alignment", () => {
			const b = bboxOfOps([text("right")]);
			expect(b.minX).toBeCloseTo(100 - width);
			expect(b.maxX).toBeCloseTo(100);
		});
	});
});

describe("frameScene", () => {
	it("returns an empty scene for no op", () => {
		expect(frameScene([], 10)).toEqual({ ops: [], width: 0, height: 0 });
	});

	it("moves the margin-expanded box to the origin", () => {
		const scene = frameScene(
			[{ op: "rect", x: 100, y: 200, w: 50, h: 30 }],
			10,
		);
		expect(scene.width).toBe(70);
		expect(scene.height).toBe(50);
		expect(scene.ops).toEqual([{ op: "rect", x: 10, y: 10, w: 50, h: 30 }]);
	});

	it("shifts content that starts at negative coordinates", () => {
		const scene = frameScene([{ op: "rect", x: -20, y: -5, w: 10, h: 10 }], 4);
		expect(scene.ops).toEqual([{ op: "rect", x: 4, y: 4, w: 10, h: 10 }]);
		expect(scene.width).toBe(18);
		expect(scene.height).toBe(18);
	});
});

describe("framePage", () => {
	it("returns the page size and the same ops for no op", () => {
		const ops: DrawOp[] = [];
		expect(framePage(ops, 800, 600, 20)).toEqual({
			ops,
			width: 800,
			height: 600,
		});
	});

	it("keeps ops and page size when everything fits inside the margins", () => {
		const ops: DrawOp[] = [{ op: "rect", x: 50, y: 50, w: 100, h: 100 }];
		const scene = framePage(ops, 800, 600, 20);
		expect(scene.ops).toBe(ops);
		expect(scene.width).toBe(800);
		expect(scene.height).toBe(600);
	});

	it("enlarges the page to the right and bottom when content overflows", () => {
		const ops: DrawOp[] = [{ op: "rect", x: 700, y: 500, w: 200, h: 200 }];
		const scene = framePage(ops, 800, 600, 20);
		expect(scene.ops).toBe(ops);
		expect(scene.width).toBe(920);
		expect(scene.height).toBe(720);
	});

	it("shifts content overflowing on the left and the top, and grows the page accordingly", () => {
		const ops: DrawOp[] = [{ op: "rect", x: -30, y: -10, w: 100, h: 100 }];
		const scene = framePage(ops, 800, 600, 20);
		expect(scene.ops).toEqual([{ op: "rect", x: 20, y: 20, w: 100, h: 100 }]);
		expect(scene.width).toBe(800);
		expect(scene.height).toBe(600);
	});

	it("shifts only the axis that overflows", () => {
		const ops: DrawOp[] = [{ op: "rect", x: -30, y: 100, w: 10, h: 10 }];
		const scene = framePage(ops, 800, 600, 20);
		expect(scene.ops).toEqual([{ op: "rect", x: 20, y: 100, w: 10, h: 10 }]);
	});
});
