/** @jest-environment jsdom */
import { getMessages } from "@/i18n/messages";
import { hasNoSkippedLevel, headingLevels } from "@tests/utils/headings";
import { render } from "@testing-library/react";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import Training from "./page";

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
				namespace: namespace as "training",
			}),
		),
	setRequestLocale: jest.fn(),
}));

jest.mock("@/ui/components/public-pages/PageTitle", () => ({
	__esModule: true,
	default: ({ children }: { children: React.ReactNode }) => <h1>{children}</h1>,
}));

jest.mock("@/ui/components/public-pages/PublicLink", () => ({
	__esModule: true,
	default: ({
		href,
		children,
	}: {
		href: string;
		children: React.ReactNode;
	}) => <a href={href}>{children}</a>,
}));

jest.mock("@/ui/components/public-pages/PublicLinkButton", () => ({
	__esModule: true,
	default: ({
		href,
		children,
	}: {
		href: string;
		children: React.ReactNode;
	}) => <a href={href}>{children}</a>,
}));

jest.mock("./ResumeSignInHint", () => ({
	__esModule: true,
	default: () => null,
}));

describe("Training hub page", () => {
	it.each(["fr", "en"] as const)(
		"renders block cards as h3 under h2 sections without skipped heading levels (%s)",
		async (locale) => {
			const ui = await Training({ params: Promise.resolve({ locale }) });
			const { container } = render(
				<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
					{ui}
				</NextIntlClientProvider>,
			);
			const levels = headingLevels(container);

			expect(levels.filter((l) => l === 1)).toHaveLength(1);
			expect(levels).toContain(3);
			expect(hasNoSkippedLevel(levels)).toBe(true);
		},
	);
});
