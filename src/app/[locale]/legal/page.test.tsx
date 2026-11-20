/** @jest-environment jsdom */
import { LOCALES, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import { hasNoSkippedLevel, headingLevels } from "@tests/utils/headings";
import LegalNotice from "./page";

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
				namespace: namespace as "public.legal",
			}),
		),
	setRequestLocale: jest.fn(),
}));

jest.mock("@/ui/components/public-pages/PageTitle", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

jest.mock("./LegalTranslationNotice", () => ({
	__esModule: true,
	default: ({ locale, href }: { locale: Locale; href: string }) => (
		<aside
			data-testid="translation-notice"
			data-locale={locale}
			data-href={href}
		/>
	),
}));

const renderLegal = async (locale: Locale) => {
	const ui = await LegalNotice({ params: Promise.resolve({ locale }) });
	return render(
		<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
			{ui}
		</NextIntlClientProvider>,
	);
};

describe("Legal notice page", () => {
	it.each(LOCALES)(
		"has a single h1 and no skipped heading level (%s)",
		async (locale) => {
			const { container } = await renderLegal(locale);
			const levels = headingLevels(container);
			expect(levels.filter((l) => l === 1)).toHaveLength(1);
			expect(hasNoSkippedLevel(levels)).toBe(true);
		},
	);

	it("refers to the privacy policy for the data processed", async () => {
		await renderLegal("fr");
		expect(
			screen.getByRole("link", { name: "politique de confidentialité." }),
		).toHaveAttribute("href", "/politique-de-confidentialite");
	});

	it("passes its locale and its own route to the translation notice", async () => {
		await renderLegal("es");
		const notice = screen.getByTestId("translation-notice");
		expect(notice).toHaveAttribute("data-locale", "es");
		expect(notice).toHaveAttribute("data-href", "/legal");
		expect(
			screen.getByRole("link", { name: "política de privacidad." }),
		).toHaveAttribute("href", "/es/politica-de-privacidad");
	});
});
