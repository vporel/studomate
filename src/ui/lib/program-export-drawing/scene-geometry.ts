import { DrawOp, Scene } from "./draw-op";
import { estimateTextWidth } from "./text-layout";

export type Bbox = { minX: number; minY: number; maxX: number; maxY: number };

const extendPath = (b: Bbox, d: string) => {
	const nums = (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
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
				const width = estimateTextWidth(op.text, op.fontSize);
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
			/([MLC])\s*((?:-?\d*\.?\d+[\s,]*)+)/gi,
			(_m, cmd: string, coords: string) => {
				const nums = coords.trim().split(/[\s,]+/).map(Number);
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
 * Assemble une scène à la taille d'une page (le grafcet garde sa position et son échelle
 * d'origine, pas de zoom au contenu). La scène est agrandie et le contenu décalé seulement si
 * un élément déborde du cadre `[margin, page - margin]`.
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
