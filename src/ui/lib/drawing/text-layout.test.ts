import { jsPDF } from "jspdf";
import { estimateTextWidth, wrapText } from "./text-layout";

const MM_PER_PT = 25.4 / 72;
const FONT_SIZE_PT = 10;

/** Real Helvetica width of `text` in points, as the PDF backend would draw it. */
function realWidth(text: string, bold = false): number {
	const doc = new jsPDF();
	doc.setFont("helvetica", bold ? "bold" : "normal");
	doc.setFontSize(FONT_SIZE_PT);
	return doc.getTextWidth(text) / MM_PER_PT;
}

const SAMPLES: [label: string, text: string][] = [
	["lowercase", "the quick brown fox jumps over the lazy dog"],
	[
		"uppercase and underscores",
		"TEMPO_FIN_CYCLE AND NOT CAPTEUR_HAUT_2 OR START_BUTTON",
	],
	["digits", "1234567890 1234567890 1234567890"],
	["mixed expression", "X12 AND (I0_4 OR NOT Q1_2) AND tempo_3.Q"],
	["wide letters", "MMMMMMWWWWWW"],
	["punctuation", `@#$%&*+=<>?!"'(){}[]|~^\`/\\:;,.-`],
	["accents", "Étape suivante à vérifier : système prêt"],
];

describe("estimateTextWidth", () => {
	it("is proportional to the font size and zero for an empty text", () => {
		expect(estimateTextWidth("", 10)).toBe(0);
		expect(estimateTextWidth("Hello", 20)).toBeCloseTo(
			2 * estimateTextWidth("Hello", 10),
			10,
		);
	});

	it.each(SAMPLES)(
		"matches the real Helvetica width within 2%%: %s",
		(_label, text) => {
			const estimated = estimateTextWidth(text, FONT_SIZE_PT);

			expect(estimated).toBeGreaterThan(realWidth(text) * 0.98);
			expect(estimated).toBeLessThan(realWidth(text) * 1.02);
		},
	);

	it.each(SAMPLES)(
		"never underestimates bold text, by 12%% at most: %s",
		(_label, text) => {
			const estimated = estimateTextWidth(text, FONT_SIZE_PT, true);

			expect(estimated).toBeGreaterThanOrEqual(realWidth(text, true));
			expect(estimated).toBeLessThan(realWidth(text, true) * 1.12);
		},
	);

	it("measures uppercase text wider than lowercase text of the same length", () => {
		expect(estimateTextWidth("CAPTEUR", 10)).toBeGreaterThan(
			estimateTextWidth("capteur", 10),
		);
	});

	it("gives an accented letter the width of its base letter", () => {
		expect(estimateTextWidth("é", 10)).toBe(estimateTextWidth("e", 10));
		expect(estimateTextWidth("À", 10)).toBe(estimateTextWidth("A", 10));
	});

	it("falls back to an average width for a character with no ASCII base", () => {
		expect(estimateTextWidth("→", 10)).toBeGreaterThan(0);
		expect(estimateTextWidth("→", 10)).toBe(estimateTextWidth("0", 10));
	});
});

describe("wrapText", () => {
	it("keeps a short line intact", () => {
		expect(wrapText("t0/X0/10s", 500, 12)).toEqual(["t0/X0/10s"]);
	});

	it("wraps on the available width", () => {
		expect(wrapText("un deux trois quatre", 55, 12)).toEqual([
			"un deux",
			"trois",
			"quatre",
		]);
	});

	it("never produces a line wider than the available width when it can be split", () => {
		const text =
			"CAPTEUR_HAUT AND CAPTEUR_BAS OR START_BUTTON AND NOT EMERGENCY_STOP";
		const maxWidth = 150;

		const lines = wrapText(text, maxWidth, FONT_SIZE_PT);

		expect(lines.length).toBeGreaterThan(1);
		lines.forEach((line) =>
			expect(realWidth(line)).toBeLessThanOrEqual(maxWidth),
		);
	});

	it("respects the explicit line breaks", () => {
		expect(wrapText("a\nb", 500, 12)).toEqual(["a", "b"]);
		expect(wrapText("a\n\nb", 500, 12)).toEqual(["a", "", "b"]);
	});

	it("does not split a word wider than the area", () => {
		expect(wrapText("anticonstitutionnellement", 20, 12)).toEqual([
			"anticonstitutionnellement",
		]);
	});
});
