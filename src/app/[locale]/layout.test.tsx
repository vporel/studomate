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

	it("répond 404 pour une locale inconnue", async () => {
		await expect(
			LocaleLayout({
				children: null,
				params: Promise.resolve({ locale: "zz" }),
			}),
		).rejects.toThrow("NEXT_NOT_FOUND");
	});
});
