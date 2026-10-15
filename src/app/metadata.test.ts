import {
	alternateLanguages,
	createGenerateMetadata,
	pageMetadata,
} from "./metadata";

const mockGetTranslations = jest.fn();

jest.mock("next-intl/server", () => ({
	getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
}));

describe("createGenerateMetadata", () => {
	beforeEach(() => {
		mockGetTranslations.mockResolvedValue((key: string) => `msg:${key}`);
	});
	afterEach(() => jest.clearAllMocks());

	it("lit titre et description sous les clés données, dans public.metadata", async () => {
		const generate = createGenerateMetadata(
			"/about",
			"aboutTitle",
			"aboutDescription",
		);

		const metadata = await generate({
			params: Promise.resolve({ locale: "en" }),
		});

		expect(mockGetTranslations).toHaveBeenCalledWith({
			locale: "en",
			namespace: "public.metadata",
		});
		expect(metadata.title).toBe("msg:aboutTitle");
		expect(metadata.description).toBe("msg:aboutDescription");
		expect(metadata.title).toBe("msg:aboutTitle");
		expect(metadata.openGraph?.title).toBe("msg:aboutTitle — Studomate");
	});

	it("génère canonical et hreflang pour le chemin donné", async () => {
		const generate = createGenerateMetadata(
			"/about",
			"aboutTitle",
			"aboutDescription",
		);

		const metadata = await generate({
			params: Promise.resolve({ locale: "fr" }),
		});

		expect(metadata.alternates?.canonical).toEqual(
			metadata.alternates?.languages?.fr,
		);
		expect(Object.keys(metadata.alternates?.languages ?? {})).toEqual(
			expect.arrayContaining(["fr", "en", "x-default"]),
		);
		expect(metadata.alternates?.languages?.["x-default"]).toBe(
			metadata.alternates?.languages?.fr,
		);
	});

	it("complète openGraph (type, siteName, image) et la carte Twitter avec les textes de la page", async () => {
		const generate = createGenerateMetadata(
			"/about",
			"aboutTitle",
			"aboutDescription",
		);

		const metadata = await generate({
			params: Promise.resolve({ locale: "en" }),
		});

		expect(metadata.openGraph).toMatchObject({
			type: "website",
			siteName: "Studomate",
			locale: "en_US",
			images: [{ url: "/images/og.png", width: 1200, height: 630 }],
		});
		expect(metadata.twitter).toMatchObject({
			card: "summary_large_image",
			title: "msg:aboutTitle — Studomate",
			description: "msg:aboutDescription",
			images: ["/images/og.png"],
		});
	});

	it("retombe sur la locale par défaut pour une locale inconnue", async () => {
		const generate = createGenerateMetadata(
			"/about",
			"aboutTitle",
			"aboutDescription",
		);

		await generate({ params: Promise.resolve({ locale: "zz" }) });

		expect(mockGetTranslations).toHaveBeenCalledWith({
			locale: "fr",
			namespace: "public.metadata",
		});
	});
});

describe("alternateLanguages", () => {
	it("pointe x-default vers la version française, y compris sous /en et pour une route dynamique", () => {
		const href = {
			pathname: "/user-manual/[section]" as const,
			params: { section: "grafcet" },
		};

		const languages = alternateLanguages(href);

		expect(languages["x-default"]).toBe(languages.fr);
		expect(languages.en).toContain("/en/");
		expect(languages["x-default"]).not.toContain("/en/");
	});
});

describe("titres", () => {
	it("laisse le suffixe au title.template mais complète openGraph et twitter", () => {
		const metadata = pageMetadata("fr", "/about", "À propos", "desc");

		expect(metadata.title).toBe("À propos");
		expect(metadata.openGraph?.title).toBe("À propos — Studomate");
		expect(metadata.twitter?.title).toBe("À propos — Studomate");
	});

	it("avec absoluteTitle, le titre échappe au template et reste tel quel partout", () => {
		const metadata = pageMetadata("en", "/", "Home — Studomate", "desc", {
			absoluteTitle: true,
		});

		expect(metadata.title).toEqual({ absolute: "Home — Studomate" });
		expect(metadata.openGraph?.title).toBe("Home — Studomate");
		expect(metadata.twitter?.title).toBe("Home — Studomate");
	});
});
