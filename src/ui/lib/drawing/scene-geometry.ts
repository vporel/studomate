import { DrawOp, PATH_NUMBER_PATTERN, Scene } from "./draw-op";
import { estimateTextWidth } from "./text-layout";

export type Bbox = { minX: number; minY: number; maxX: number; maxY: number };

const extendPath = (b: Bbox, d: string) => {
	const nums = (d.match(new RegExp(PATH_NUMBER_PATTERN, "gi")) ?? []).map(
		Number,
	);
	for (let i = 0; i + 1 < nums.length; i += 2) {
		b.minX = Math.min(b.minX, nums[i]);
		b.maxX = Math.max(b.maxX, nums[i]);
		b.minY = Math.min(b.minY, nums[i + 1]);
		b.maxY = Math.max(b.maxY, nums[i + 1]);
	}
};

/** Bounding box du contenu peint par une liste d'ops (le texte est estimé, cf. `text-layout`). */
export function bboxOfOps(ops: DrawOp[]): Bbox {
	const b: Bbox = {
		minX: Infinity,
		minY: Infinity,
		maxX: -Infinity,
		maxY: -Infinity,
	};
	const pt = (x: number, y: number) => {
		b.minX = Math.min(b.minX, x);
		b.maxX = Math.max(b.maxX, x);
		b.minY = Math.min(b.minY, y);
		b.maxY = Math.max(b.maxY, y);
	};
	for (const op of ops) {
		switch (op.op) {
			case "rect":
				pt(op.x, op.y);
				pt(op.x + op.w, op.y + op.h);
				break;
			case "line":
				pt(op.x1, op.y1);
				pt(op.x2, op.y2);
				break;
			case "polyline":
				for (const [x, y] of op.points) pt(x, y);
				break;
			case "circle":
				pt(op.cx - op.r, op.cy - op.r);
				pt(op.cx + op.r, op.cy + op.r);
				break;
			case "path":
				extendPath(b, op.d);
				break;
			case "text": {
				const width = estimateTextWidth(op.text, op.fontSize, op.bold);
				const left =
					op.align === "center"
						? op.x - width / 2
						: op.align === "right"
							? op.x - width
							: op.x;
				pt(left, op.y - op.fontSize);
				pt(left + width, op.y + op.fontSize);
				break;
			}
		}
	}
	return b;
}

/** Nouvelle liste d'ops décalée de `(dx, dy)`. Les ops sont traitées comme immuables. */
export function translateOps(ops: DrawOp[], dx: number, dy: number): DrawOp[] {
	const shiftPath = (d: string): string =>
		d.replace(
			new RegExp(`([MLC])\\s*((?:${PATH_NUMBER_PATTERN}[\\s,]*)+)`, "gi"),
			(_m, cmd: string, coords: string) => {
				const nums = coords
					.trim()
					.split(/[\s,]+/)
					.map(Number);
				const shifted = nums.map((n, i) => (i % 2 === 0 ? n + dx : n + dy));
				return `${cmd} ${shifted.join(" ")}`;
			},
		);
	return ops.map((op): DrawOp => {
		switch (op.op) {
			case "rect":
				return { ...op, x: op.x + dx, y: op.y + dy };
			case "line":
				return {
					...op,
					x1: op.x1 + dx,
					y1: op.y1 + dy,
					x2: op.x2 + dx,
					y2: op.y2 + dy,
				};
			case "polyline":
				return {
					...op,
					points: op.points.map(([x, y]) => [x + dx, y + dy]),
				};
			case "circle":
				return { ...op, cx: op.cx + dx, cy: op.cy + dy };
			case "path":
				return { ...op, d: shiftPath(op.d) };
			case "text":
				return { ...op, x: op.x + dx, y: op.y + dy };
		}
	});
}

/** New list of ops scaled by `factor` around the origin (coordinates, stroke widths, font sizes,
 * dashes). The ops are treated as immutable. */
export function scaleOps(ops: DrawOp[], factor: number): DrawOp[] {
	const scaleDash = (dash?: [number, number]): [number, number] | undefined =>
		dash && [dash[0] * factor, dash[1] * factor];
	const scaleWidth = (w?: number) => (w === undefined ? w : w * factor);
	const scalePath = (d: string): string =>
		d.replace(new RegExp(PATH_NUMBER_PATTERN, "gi"), (n) =>
			String(Number(n) * factor),
		);
	return ops.map((op): DrawOp => {
		switch (op.op) {
			case "rect":
				return {
					...op,
					x: op.x * factor,
					y: op.y * factor,
					w: op.w * factor,
					h: op.h * factor,
					rx: op.rx === undefined ? op.rx : op.rx * factor,
					strokeWidth: scaleWidth(op.strokeWidth),
					dash: scaleDash(op.dash),
				};
			case "line":
				return {
					...op,
					x1: op.x1 * factor,
					y1: op.y1 * factor,
					x2: op.x2 * factor,
					y2: op.y2 * factor,
					strokeWidth: scaleWidth(op.strokeWidth),
					dash: scaleDash(op.dash),
				};
			case "polyline":
				return {
					...op,
					points: op.points.map(([x, y]) => [x * factor, y * factor]),
					strokeWidth: scaleWidth(op.strokeWidth),
					dash: scaleDash(op.dash),
				};
			case "circle":
				return {
					...op,
					cx: op.cx * factor,
					cy: op.cy * factor,
					r: op.r * factor,
					strokeWidth: scaleWidth(op.strokeWidth),
				};
			case "path":
				return {
					...op,
					d: scalePath(op.d),
					strokeWidth: scaleWidth(op.strokeWidth),
				};
			case "text":
				return {
					...op,
					x: op.x * factor,
					y: op.y * factor,
					fontSize: op.fontSize * factor,
				};
		}
	});
}

/**
 * Assemble une scène recadrée : bbox des ops + marge, tout décalé pour que le coin haut-gauche
 * de la bbox élargie soit à l'origine.
 */
export function frameScene(ops: DrawOp[], margin: number): Scene {
	const b = bboxOfOps(ops);
	if (!Number.isFinite(b.minX)) return { ops: [], width: 0, height: 0 };
	const shifted = translateOps(ops, margin - b.minX, margin - b.minY);
	return {
		ops: shifted,
		width: b.maxX - b.minX + 2 * margin,
		height: b.maxY - b.minY + 2 * margin,
	};
}

/**
 * Builds a page-sized scene (the content keeps its original position and scale, no zoom to fit).
 * The scene is enlarged and the content shifted only when an element overflows the
 * `[margin, page - margin]` frame.
 */
export function framePage(
	ops: DrawOp[],
	pageWidth: number,
	pageHeight: number,
	margin: number,
): Scene {
	const b = bboxOfOps(ops);
	if (!Number.isFinite(b.minX)) {
		return { ops, width: pageWidth, height: pageHeight };
	}
	const dx = Math.max(0, margin - b.minX);
	const dy = Math.max(0, margin - b.minY);
	return {
		ops: dx || dy ? translateOps(ops, dx, dy) : ops,
		width: Math.max(pageWidth, b.maxX + dx + margin),
		height: Math.max(pageHeight, b.maxY + dy + margin),
	};
}
