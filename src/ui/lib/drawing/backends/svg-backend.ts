import {
	DEFAULT_STROKE,
	DEFAULT_STROKE_WIDTH,
	DrawOp,
	FONT_FAMILY,
	Scene,
} from "../draw-op";

/** Échappe le texte destiné à un nœud texte ou à une valeur d'attribut XML. */
export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

const num = (n: number): string => {
	// Évite `-0` et les longues traînes de décimales dans la sortie.
	const r = Math.round(n * 1000) / 1000;
	return String(r === 0 ? 0 : r);
};

const strokeAttrs = (op: {
	stroke?: string;
	strokeWidth?: number;
	dash?: [number, number];
}): string => {
	const parts = [
		`stroke="${op.stroke ?? DEFAULT_STROKE}"`,
		`stroke-width="${num(op.strokeWidth ?? DEFAULT_STROKE_WIDTH)}"`,
	];
	if (op.dash) parts.push(`stroke-dasharray="${op.dash.map(num).join(" ")}"`);
	return parts.join(" ");
};

const anchor = (align: "left" | "center" | "right" = "left"): string =>
	align === "center" ? "middle" : align === "right" ? "end" : "start";

const dominantBaseline = (
	baseline: "top" | "middle" | "alphabetic" = "alphabetic",
): string =>
	baseline === "middle"
		? "central"
		: baseline === "top"
			? "hanging"
			: "alphabetic";

function opToSvg(op: DrawOp): string {
	switch (op.op) {
		case "rect": {
			const fill = op.fill ?? "none";
			const rx = op.rx ? ` rx="${num(op.rx)}"` : "";
			return `<rect x="${num(op.x)}" y="${num(op.y)}" width="${num(op.w)}" height="${num(op.h)}"${rx} fill="${fill}" ${strokeAttrs(op)}/>`;
		}
		case "line":
			return `<line x1="${num(op.x1)}" y1="${num(op.y1)}" x2="${num(op.x2)}" y2="${num(op.y2)}" ${strokeAttrs(op)}/>`;
		case "polyline": {
			const pts = op.points.map(([x, y]) => `${num(x)},${num(y)}`).join(" ");
			const tag = op.closed ? "polygon" : "polyline";
			return `<${tag} points="${pts}" fill="${op.fill ?? "none"}" ${strokeAttrs(op)}/>`;
		}
		case "circle":
			return `<circle cx="${num(op.cx)}" cy="${num(op.cy)}" r="${num(op.r)}" fill="${op.fill ?? "none"}" ${strokeAttrs(op)}/>`;
		case "path":
			return `<path d="${escapeXml(op.d)}" fill="${op.fill ?? "none"}" ${strokeAttrs(op)}/>`;
		case "text": {
			const weight = op.bold ? ` font-weight="bold"` : "";
			return `<text x="${num(op.x)}" y="${num(op.y)}" font-family="${FONT_FAMILY}" font-size="${num(op.fontSize)}" fill="${op.color ?? DEFAULT_STROKE}" text-anchor="${anchor(op.align)}" dominant-baseline="${dominantBaseline(op.baseline)}"${weight}>${escapeXml(op.text)}</text>`;
		}
	}
}

/** Sérialise une scène en document `<svg>` autonome (fond blanc, viewBox calée sur la scène). */
export function sceneToSvg(scene: Scene): string {
	const body = scene.ops.map(opToSvg).join("\n\t");
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(scene.width)} ${num(scene.height)}" width="${num(scene.width)}" height="${num(scene.height)}">`,
		`\t<rect x="0" y="0" width="${num(scene.width)}" height="${num(scene.height)}" fill="#ffffff"/>`,
		`\t${body}`,
		`</svg>`,
	].join("\n");
}
