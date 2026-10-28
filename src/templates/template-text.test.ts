import { getMessages } from "@/i18n/messages";
import { LOCALES } from "@/i18n/config";
import createTemplateText, { getTemplateStatement } from "./template-text";

describe("createTemplateText", () => {
	it("lève une erreur pour une clé absente", () => {
		expect(() => createTemplateText("traffic-light", "fr")("inconnue")).toThrow(
			/Missing template text "traffic-light.inconnue"/,
		);
	});

	it("remplace les paramètres {nom} et laisse les inconnus intacts", () => {
		const messages = getMessages("fr").templateContent;
		messages["__test"] = { texts: { greeting: "Bonjour {name}, {other}" } };
		try {
			const t = createTemplateText("__test", "fr");
			expect(t("greeting", { name: "Zoé" })).toBe("Bonjour Zoé, {other}");
		} finally {
			delete messages["__test"];
		}
	});
});

describe("getTemplateStatement", () => {
	it.each(LOCALES)("rend l'énoncé d'un template en %s", (locale) => {
		expect(getTemplateStatement("traffic-light", locale)).toContain("##");
	});

	it("rend undefined pour un template inconnu", () => {
		expect(getTemplateStatement("inconnu", "fr")).toBeUndefined();
	});
});
