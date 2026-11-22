import { getMessages } from "@/i18n/messages";
import { createTranslator } from "next-intl";
import LanguageSuggestion from "./LanguageSuggestion";

jest.mock("next-intl/server", () => ({
	getTranslations: ({
		locale,
		namespace,
	}: {
		locale: "fr" | "en" | "es";
		namespace: string;
	}) =>
		Promise.resolve(
			createTranslator({
				locale,
				messages: getMessages(locale),
				namespace: namespace as "public.languageSuggestion",
			}),
		),
}));

describe("LanguageSuggestion", () => {
	it("holds the texts of every other language, worded in their own language", async () => {
		const element = await LanguageSuggestion({ locale: "fr" });

		expect(element.props.suggestions.en.action).toBe("View in English");
		expect(element.props.suggestions.es.action).toBe("Ver en español");
		expect(element.props.suggestions.fr).toBeUndefined();
	});

	it("leaves out the page's own language", async () => {
		const element = await LanguageSuggestion({ locale: "en" });

		expect(Object.keys(element.props.suggestions).sort()).toEqual(["es", "fr"]);
		expect(element.props.suggestions.fr.action).toBe("Voir en français");
	});
});
