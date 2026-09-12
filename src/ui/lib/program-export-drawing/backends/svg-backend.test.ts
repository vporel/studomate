import { Scene } from "../draw-op";
import { escapeXml, sceneToSvg } from "./svg-backend";

describe("escapeXml", () => {
	it("échappe les caractères réservés", () => {
		expect(escapeXml('a & b < c > "d"')).toBe("a &amp; b &lt; c &gt; &quot;d&quot;");
	});
});

describe("sceneToSvg", () => {
	const wrap = (ops: Scene["ops"]): string =>
		sceneToSvg({ ops, width: 100, height: 50 });

	it("émet un document autonome avec viewBox et fond blanc", () => {
		const svg = wrap([]);
		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(svg).toContain('viewBox="0 0 100 50"');
		expect(svg).toContain('<rect x="0" y="0" width="100" height="50" fill="#ffffff"/>');
	});

	it("rend un rectangle arrondi avec ses attributs de trait", () => {
		const svg = wrap([
			{ op: "rect", x: 10, y: 20, w: 30, h: 40, rx: 5, strokeWidth: 1 },
		]);
		expect(svg).toContain(
			'<rect x="10" y="20" width="30" height="40" rx="5" fill="none" stroke="#000000" stroke-width="1"/>',
		);
	});

	it("rend une polyline fermée en polygon et les pointillés", () => {
		const svg = wrap([
			{
				op: "polyline",
				points: [
					[0, 0],
					[10, 0],
					[10, 10],
				],
				closed: true,
				dash: [4, 3],
			},
		]);
		expect(svg).toContain('<polygon points="0,0 10,0 10,10"');
		expect(svg).toContain('stroke-dasharray="4 3"');
	});

	it("échappe le texte et applique l'ancrage", () => {
		const svg = wrap([
			{
				op: "text",
				x: 5,
				y: 6,
				text: "a & b",
				fontSize: 12,
				align: "center",
				baseline: "middle",
			},
		]);
		expect(svg).toContain(">a &amp; b</text>");
		expect(svg).toContain('text-anchor="middle"');
		expect(svg).toContain('dominant-baseline="central"');
	});
});
