import { DrawOp } from "./draw-op";
import { scaleOps, translateOps } from "./scene-geometry";

describe("scaleOps", () => {
	it("scales coordinates, stroke widths and dashes of every shape", () => {
		const ops: DrawOp[] = [
			{
				op: "rect",
				x: 1,
				y: 2,
				w: 10,
				h: 20,
				rx: 3,
				strokeWidth: 2,
				dash: [4, 2],
			},
			{ op: "line", x1: 0, y1: 1, x2: 5, y2: 6, strokeWidth: 2 },
			{
				op: "polyline",
				points: [
					[1, 1],
					[2, 3],
				],
				dash: [1, 1],
			},
			{ op: "circle", cx: 4, cy: 5, r: 3, strokeWidth: 1 },
		];
		expect(scaleOps(ops, 2)).toEqual([
			{
				op: "rect",
				x: 2,
				y: 4,
				w: 20,
				h: 40,
				rx: 6,
				strokeWidth: 4,
				dash: [8, 4],
			},
			{ op: "line", x1: 0, y1: 2, x2: 10, y2: 12, strokeWidth: 4 },
			{
				op: "polyline",
				points: [
					[2, 2],
					[4, 6],
				],
				dash: [2, 2],
			},
			{ op: "circle", cx: 8, cy: 10, r: 6, strokeWidth: 2 },
		]);
	});

	it("scales the position and the font size of a text", () => {
		const [text] = scaleOps(
			[{ op: "text", x: 10, y: 20, text: "A", fontSize: 8 }],
			0.5,
		);
		expect(text).toMatchObject({ x: 5, y: 10, fontSize: 4 });
	});

	it("scales every number of a path, decimals and negatives included", () => {
		const [path] = scaleOps(
			[{ op: "path", d: "M 10 -20 C 1.5 2 3 4 5 6 L 8 9 Z" }],
			2,
		);
		expect(path).toMatchObject({ d: "M 20 -40 C 3 4 6 8 10 12 L 16 18 Z" });
	});

	it("scales numbers written in exponent notation", () => {
		const [path] = scaleOps(
			[{ op: "path", d: "M 1e-7 10 C 2E+2 0 .5 1 3 4" }],
			2,
		);
		expect(path).toMatchObject({ d: "M 2e-7 20 C 400 0 1 2 6 8" });
	});

	it("leaves absent optional fields absent and does not mutate its input", () => {
		const ops: DrawOp[] = [{ op: "line", x1: 0, y1: 0, x2: 1, y2: 1 }];
		const [line] = scaleOps(ops, 3);
		expect((line as { strokeWidth?: number }).strokeWidth).toBeUndefined();
		expect(ops[0]).toEqual({ op: "line", x1: 0, y1: 0, x2: 1, y2: 1 });
	});
});

describe("translateOps", () => {
	it("shifts path coordinates, exponent notation included", () => {
		const [path] = translateOps(
			[{ op: "path", d: "M 1e-7 10 C 1 2 3 4 5 6 L 2e1 0 Z" }],
			10,
			100,
		);
		expect(path).toMatchObject({
			d: "M 10.0000001 110C 11 102 13 104 15 106L 30 100Z",
		});
	});
});
