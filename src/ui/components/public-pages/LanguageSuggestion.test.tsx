import { getMessages } from "@/i18n/messages";
import { createTranslator } from "next-intl";
import LanguageSuggestion from "./LanguageSuggestion";

jest.mock("next-intl/server", () => ({
	getTranslations: ({
		locale,
		namespace,
	}: {
		locale: "fr" | "en";
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
	it("offers English, worded in English, on a French page", async () => {
		const element = await LanguageSuggestion({ locale: "fr" });

		expect(element.props).toMatchObject({
			targetLocale: "en",
			action: "View in English",
		});
	});

	it("offers French, worded in French, on an English page", async () => {
		const element = await LanguageSuggestion({ locale: "en" });

		expect(element.props).toMatchObject({
			targetLocale: "fr",
			action: "Voir en français",
		});
	});
});
