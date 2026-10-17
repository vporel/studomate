import { readFileSync } from "fs";
import path from "path";
import PUBLIC_PAGES_CLASS from "@/ui/components/public-pages/public-pages-class";
import LocaleLayout from "./layout";

jest.mock("@/app/RootDocument", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/ui/components/public-pages/Header", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("@/ui/components/public-pages/Footer", () => ({
	__esModule: true,
	default: () => null,
}));
jest.mock("next-intl/server", () => ({ setRequestLocale: jest.fn() }));
jest.mock("next/navigation", () => ({
	notFound: () => {
		throw new Error("NEXT_NOT_FOUND");
	},
}));

describe("LocaleLayout", () => {
	it.each(["fr", "en"])(
		"déclare lang=%s dans le HTML serveur pour la locale %s",
		async (locale) => {
			const element = await LocaleLayout({
				children: null,
				params: Promise.resolve({ locale }),
			});

			expect(element.props.lang).toBe(locale);
		},
	);

	it("enveloppe header, contenu et footer dans le conteneur des pages publiques, qui rétablit un anneau de focus clavier", async () => {
		const element = await LocaleLayout({
			children: null,
			params: Promise.resolve({ locale: "fr" }),
		});
		const intlProvider = element.props.children;
		const wrapper = [intlProvider.props.children]
			.flat()
			.find((child: { type?: unknown }) => child?.type === "div");

		expect(wrapper.props.className).toBe(PUBLIC_PAGES_CLASS);
		const css = readFileSync(path.join(__dirname, "..", "globals.css"), "utf8");
		expect(css).toMatch(
			new RegExp(
				`\\.${PUBLIC_PAGES_CLASS} :focus-visible\\s*\\{[^}]*outline: 2px solid`,
			),
		);
	});

	it("répond 404 pour une locale inconnue", async () => {
		await expect(
			LocaleLayout({
				children: null,
				params: Promise.resolve({ locale: "zz" }),
			}),
		).rejects.toThrow("NEXT_NOT_FOUND");
	});
});
