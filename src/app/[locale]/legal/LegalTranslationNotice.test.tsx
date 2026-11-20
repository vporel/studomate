/** @jest-environment jsdom */
import type { Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import LegalTranslationNotice from "./LegalTranslationNotice";

jest.mock("next-intl/server", () => ({
	getTranslations: ({
		locale,
		namespace,
	}: {
		locale: Locale;
		namespace: string;
	}) =>
		Promise.resolve(
			createTranslator({
				locale,
				messages: getMessages(locale),
				namespace: namespace as "public.legalTranslationNotice",
			}),
		),
}));

const renderNotice = async (
	locale: Locale,
	href: "/legal" | "/terms" | "/privacy",
) => {
	const ui = await LegalTranslationNotice({ locale, href });
	return render(
		<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
			{ui}
		</NextIntlClientProvider>,
	);
};

describe("LegalTranslationNotice", () => {
	it("n'affiche rien sur la version française, qui fait foi", async () => {
		expect(
			await LegalTranslationNotice({ locale: "fr", href: "/legal" }),
		).toBeNull();
	});

	it("renvoie vers la même page en français, depuis l'anglais", async () => {
		await renderNotice("en", "/terms");

		expect(
			screen.getByText(/only the French version is legally binding/),
		).toBeInTheDocument();
		const link = screen.getByRole("link", { name: "Read the French version" });
		expect(link).toHaveAttribute("href", "/fr/conditions-d-utilisation");
		expect(link).toHaveAttribute("hreflang", "fr");
	});

	it("renvoie vers la même page en français, depuis l'espagnol", async () => {
		await renderNotice("es", "/privacy");

		expect(
			screen.getByRole("link", { name: "Leer la versión francesa" }),
		).toHaveAttribute("href", "/fr/politique-de-confidentialite");
	});
});
