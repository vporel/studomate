import { estimateTextWidth, wrapText } from "./text-layout";

describe("estimateTextWidth", () => {
	it("est proportionnel à la longueur et à la taille de police", () => {
		expect(estimateTextWidth("abcd", 10)).toBe(20);
		expect(estimateTextWidth("", 10)).toBe(0);
	});
});

describe("wrapText", () => {
	it("garde une ligne courte intacte", () => {
		expect(wrapText("t0/X0/10s", 500, 12)).toEqual(["t0/X0/10s"]);
	});

	it("coupe sur la largeur disponible", () => {
		expect(wrapText("un deux trois quatre", 48, 12)).toEqual([
			"un deux",
			"trois",
			"quatre",
		]);
	});

	it("respecte les retours à la ligne explicites", () => {
		expect(wrapText("a\nb", 500, 12)).toEqual(["a", "b"]);
		expect(wrapText("a\n\nb", 500, 12)).toEqual(["a", "", "b"]);
	});

	it("ne coupe pas un mot plus large que la zone", () => {
		expect(wrapText("anticonstitutionnellement", 20, 12)).toEqual([
			"anticonstitutionnellement",
		]);
	});
});
