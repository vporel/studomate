import type { jsPDF } from "jspdf";
import { Scene } from "../draw-op";
import { parsePathData, renderSceneToJsPdf } from "./jspdf-backend";

describe("parsePathData", () => {
	it("lit les commandes M/L/C/Z absolues", () => {
		expect(parsePathData("M 0 0 L 10 20 C 1 2 3 4 5 6 Z")).toEqual([
			{ type: "M", x: 0, y: 0 },
			{ type: "L", x: 10, y: 20 },
			{ type: "C", x1: 1, y1: 2, x2: 3, y2: 4, x: 5, y: 6 },
			{ type: "Z" },
		]);
	});

	it("tolère l'absence d'espaces et les décimales négatives", () => {
		expect(parsePathData("M0,0L-1.5,2")).toEqual([
			{ type: "M", x: 0, y: 0 },
			{ type: "L", x: -1.5, y: 2 },
		]);
	});
});

function fakeDoc() {
	const calls: Record<string, unknown[][]> = {};
	const rec =
		(name: string) =>
		(...args: unknown[]) => {
			(calls[name] ??= []).push(args);
			return doc;
		};
	const doc = {
		calls,
		setDrawColor: rec("setDrawColor"),
		setFillColor: rec("setFillColor"),
		setTextColor: rec("setTextColor"),
		setLineWidth: rec("setLineWidth"),
		setLineDashPattern: rec("setLineDashPattern"),
		setFont: rec("setFont"),
		setFontSize: rec("setFontSize"),
		rect: rec("rect"),
		roundedRect: rec("roundedRect"),
		line: rec("line"),
		circle: rec("circle"),
		moveTo: rec("moveTo"),
		lineTo: rec("lineTo"),
		curveTo: rec("curveTo"),
		close: rec("close"),
		stroke: rec("stroke"),
		fillStroke: rec("fillStroke"),
		text: rec("text"),
	};
	return doc;
}

describe("renderSceneToJsPdf", () => {
	const run = (ops: Scene["ops"]) => {
		const doc = fakeDoc();
		renderSceneToJsPdf(
			doc as unknown as jsPDF,
			{ ops, width: 100, height: 100 },
			{ x: 10, y: 20, scale: 2 },
		);
		return doc.calls;
	};

	it("applique l'offset et l'échelle aux coordonnées et longueurs", () => {
		const calls = run([{ op: "rect", x: 5, y: 5, w: 10, h: 10, strokeWidth: 1 }]);
		expect(calls.rect[0]).toEqual([20, 30, 20, 20, "S"]);
		expect(calls.setLineWidth[0]).toEqual([2]);
	});

	it("utilise roundedRect quand rx est fourni", () => {
		const calls = run([{ op: "rect", x: 0, y: 0, w: 10, h: 10, rx: 5 }]);
		expect(calls.roundedRect[0]).toEqual([10, 20, 20, 20, 10, 10, "S"]);
	});

	it("trace une polyline via moveTo/lineTo/stroke", () => {
		const calls = run([
			{
				op: "polyline",
				points: [
					[0, 0],
					[10, 0],
					[10, 10],
				],
			},
		]);
		expect(calls.moveTo[0]).toEqual([10, 20]);
		expect(calls.lineTo).toEqual([
			[30, 20],
			[30, 40],
		]);
		expect(calls.stroke).toHaveLength(1);
	});

	it("convertit les pointillés à l'échelle et les réinitialise à la fin", () => {
		const calls = run([
			{ op: "line", x1: 0, y1: 0, x2: 1, y2: 0, dash: [4, 2] },
		]);
		expect(calls.setLineDashPattern).toContainEqual([[8, 4], 0]);
		expect(calls.setLineDashPattern.at(-1)).toEqual([[], 0]);
	});

	it("convertit la taille de police px → pt", () => {
		const calls = run([
			{ op: "text", x: 0, y: 0, text: "x", fontSize: 10 },
		]);
		// 10px * scale 2 = 20mm → pt
		expect(calls.setFontSize[0][0]).toBeCloseTo((20 * 72) / 25.4);
		expect(calls.text[0][0]).toBe("x");
	});
});
