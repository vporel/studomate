import en from "@/i18n/messages/en/public.json";
import fr from "@/i18n/messages/fr/public.json";
import { featureKeys, showcaseKeys } from "./landing-content";

describe("landing-content", () => {
	it("met en vitrine les scènes 3D et l'Arduino, repris dans la featureList du JSON-LD", () => {
		expect(showcaseKeys).toEqual(
			expect.arrayContaining(["showcaseScene3d", "showcaseArduino"]),
		);
	});

	it.each([
		["fr", fr],
		["en", en],
	])(
		"a un titre, un texte et un alt pour chaque entrée de la vitrine (%s)",
		(_, messages) => {
			const landing = messages.landing as Record<string, string>;
			for (const key of showcaseKeys) {
				expect(landing[`${key}Title`]).toBeTruthy();
				expect(landing[`${key}Text`]).toBeTruthy();
				expect(landing[`${key}Alt`]).toBeTruthy();
			}
			for (const key of featureKeys) {
				expect(landing[`${key}Title`]).toBeTruthy();
			}
		},
	);
});
