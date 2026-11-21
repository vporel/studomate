/**
 * @jest-environment jsdom
 */
import { Scene } from "../draw-op";
import { escapeXml, sceneToSvg } from "./svg-backend";

describe("escapeXml", () => {
	it("échappe les caractères réservés", () => {
		expect(escapeXml('a & b < c > "d"')).toBe(
			"a &amp; b &lt; c &gt; &quot;d&quot;",
		);
	});

	it.each([
		["U+0000", "\u0000"],
		["U+0008 (retour arrière)", "\u0008"],
		["U+000B (saut de ligne doux de Word)", "\u000B"],
		["U+000C", "\u000C"],
		["U+001B (échappement)", "\u001B"],
		["U+FFFE", "\uFFFE"],
		["U+FFFF", "\uFFFF"],
		["une demi-paire haute isolée", "\uD83D"],
		["une demi-paire basse isolée", "\uDE00"],
	])("retire %s, interdit en XML 1.0", (_label, invalid) => {
		expect(escapeXml(`a${invalid}b`)).toBe("ab");
	});

	it("garde tabulation, sauts de ligne, accents et emoji complets", () => {
		const value = "a\tb\nc\rd é ç œ 😀 日本";

		expect(escapeXml(value)).toBe(value);
	});

	it("retire les caractères interdits avant d'échapper le reste", () => {
		expect(escapeXml("<a\u000B&b>")).toBe("&lt;a&amp;b&gt;");
	});

	it("laisse une chaîne vide ou sans rien d'interdit inchangée", () => {
		expect(escapeXml("")).toBe("");
		expect(escapeXml("simple")).toBe("simple");
	});
});

describe("sceneToSvg with invalid XML characters", () => {
	const parse = (svg: string) =>
		new DOMParser().parseFromString(svg, "image/svg+xml");

	it("stays well-formed XML when a text contains a control character", () => {
		const svg = sceneToSvg({
			ops: [
				{
					op: "text",
					x: 0,
					y: 10,
					text: "Nom\u000Bcollé\u0008",
					fontSize: 12,
				},
			],
			width: 100,
			height: 50,
		});

		const document = parse(svg);

		expect(document.querySelector("parsererror")).toBeNull();
		expect(document.querySelector("text")?.textContent).toBe("Nomcollé");
	});

	it("stays well-formed XML when a path carries one", () => {
		const svg = sceneToSvg({
			ops: [{ op: "path", d: "M0 0 L10\u0000 10" }],
			width: 100,
			height: 50,
		});

		expect(parse(svg).querySelector("parsererror")).toBeNull();
	});
});

describe("sceneToSvg", () => {
	const wrap = (ops: Scene["ops"]): string =>
		sceneToSvg({ ops, width: 100, height: 50 });

	it("émet un document autonome avec viewBox et fond blanc", () => {
		const svg = wrap([]);
		expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
		expect(svg).toContain('viewBox="0 0 100 50"');
		expect(svg).toContain(
			'<rect x="0" y="0" width="100" height="50" fill="#ffffff"/>',
		);
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

describe("sceneToSvg options", () => {
	const scene = {
		ops: [{ op: "line" as const, x1: 0, y1: 0, x2: 10, y2: 0 }],
		width: 20,
		height: 10,
	};

	it("paints a white background by default", () => {
		expect(sceneToSvg(scene)).toContain(
			'<rect x="0" y="0" width="20" height="10" fill="#ffffff"/>',
		);
	});

	it("paints no background when asked not to", () => {
		expect(sceneToSvg(scene, { background: false })).not.toContain("<rect");
	});

	it("scales the displayed size without changing the coordinates", () => {
		const svg = sceneToSvg(scene, { scale: 2 });

		expect(svg).toContain('viewBox="0 0 20 10" width="40" height="20"');
	});
});
