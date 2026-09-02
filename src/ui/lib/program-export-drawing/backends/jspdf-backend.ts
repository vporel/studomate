import type { jsPDF } from "jspdf";
import { DEFAULT_STROKE, DEFAULT_STROKE_WIDTH, Scene } from "../draw-op";

/** Placement de la scène sur la page : origine (mm) du point (0,0) de la scène et facteur
 * pixel → mm. */
export type ScenePlacement = {
	x: number;
	y: number;
	scale: number;
};

const MM_TO_PT = 72 / 25.4;

type PathSegment =
	| { type: "M" | "L"; x: number; y: number }
	| { type: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
	| { type: "Z" };

/** Parseur du sous-ensemble `M`/`L`/`C`/`Z` (coordonnées absolues) accepté par `DrawOp` `path`. */
export function parsePathData(d: string): PathSegment[] {
	const tokens = d.match(/[MLCZ]|-?\d*\.?\d+/gi) ?? [];
	const segments: PathSegment[] = [];
	let i = 0;
	const nextNum = () => Number(tokens[i++]);
	while (i < tokens.length) {
		const cmd = tokens[i++].toUpperCase();
		if (cmd === "M" || cmd === "L") {
			segments.push({ type: cmd, x: nextNum(), y: nextNum() });
		} else if (cmd === "C") {
			segments.push({
				type: "C",
				x1: nextNum(),
				y1: nextNum(),
				x2: nextNum(),
				y2: nextNum(),
				x: nextNum(),
				y: nextNum(),
			});
		} else if (cmd === "Z") {
			segments.push({ type: "Z" });
		}
	}
	return segments;
}

const styleString = (stroke: boolean, fill: boolean): string =>
	stroke && fill ? "FD" : fill ? "F" : "S";

export function renderSceneToJsPdf(
	doc: jsPDF,
	scene: Scene,
	placement: ScenePlacement,
): void {
	const { x: ox, y: oy, scale } = placement;
	const px = (v: number): number => ox + v * scale;
	const py = (v: number): number => oy + v * scale;
	const len = (v: number): number => v * scale;

	const applyStroke = (op: {
		stroke?: string;
		strokeWidth?: number;
		dash?: [number, number];
	}) => {
		doc.setDrawColor(op.stroke ?? DEFAULT_STROKE);
		doc.setLineWidth(len(op.strokeWidth ?? DEFAULT_STROKE_WIDTH));
		doc.setLineDashPattern(op.dash ? op.dash.map(len) : [], 0);
	};

	for (const op of scene.ops) {
		switch (op.op) {
			case "rect": {
				applyStroke(op);
				if (op.fill) doc.setFillColor(op.fill);
				const style = styleString(true, !!op.fill);
				if (op.rx) {
					doc.roundedRect(
						px(op.x),
						py(op.y),
						len(op.w),
						len(op.h),
						len(op.rx),
						len(op.rx),
						style,
					);
				} else {
					doc.rect(px(op.x), py(op.y), len(op.w), len(op.h), style);
				}
				break;
			}
			case "line": {
				applyStroke(op);
				doc.line(px(op.x1), py(op.y1), px(op.x2), py(op.y2));
				break;
			}
			case "polyline": {
				applyStroke(op);
				if (op.fill) doc.setFillColor(op.fill);
				const [first, ...rest] = op.points;
				doc.moveTo(px(first[0]), py(first[1]));
				for (const [x, y] of rest) doc.lineTo(px(x), py(y));
				if (op.closed) doc.close();
				if (op.fill && op.closed) doc.fillStroke();
				else doc.stroke();
				break;
			}
			case "circle": {
				applyStroke(op);
				if (op.fill) doc.setFillColor(op.fill);
				doc.circle(px(op.cx), py(op.cy), len(op.r), styleString(true, !!op.fill));
				break;
			}
			case "path": {
				applyStroke(op);
				if (op.fill) doc.setFillColor(op.fill);
				for (const seg of parsePathData(op.d)) {
					if (seg.type === "M") doc.moveTo(px(seg.x), py(seg.y));
					else if (seg.type === "L") doc.lineTo(px(seg.x), py(seg.y));
					else if (seg.type === "C")
						doc.curveTo(
							px(seg.x1),
							py(seg.y1),
							px(seg.x2),
							py(seg.y2),
							px(seg.x),
							py(seg.y),
						);
					else doc.close();
				}
				if (op.fill) doc.fillStroke();
				else doc.stroke();
				break;
			}
			case "text": {
				doc.setDrawColor(DEFAULT_STROKE);
				doc.setLineDashPattern([], 0);
				doc.setTextColor(op.color ?? DEFAULT_STROKE);
				doc.setFont("helvetica", op.bold ? "bold" : "normal");
				doc.setFontSize(len(op.fontSize) * MM_TO_PT);
				doc.text(op.text, px(op.x), py(op.y), {
					align: op.align ?? "left",
					baseline: op.baseline ?? "alphabetic",
				});
				break;
			}
		}
	}

	doc.setLineDashPattern([], 0);
}
