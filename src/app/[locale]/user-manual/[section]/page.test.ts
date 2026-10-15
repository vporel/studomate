import { getMessages } from "@/i18n/messages";
import { MANUAL_SECTIONS } from "../manual-sections";
import { generateMetadata, generateStaticParams } from "./page";
import UserManualSection from "./page";

const mockGetTranslations = jest.fn();
const mockPermanentRedirect = jest.fn(() => {
	throw new Error("NEXT_REDIRECT");
});

jest.mock("next-intl/server", () => ({
	getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
	setRequestLocale: jest.fn(),
}));
jest.mock("next/navigation", () => ({
	permanentRedirect: (...args: unknown[]) => mockPermanentRedirect(...(args as [])),
}));
jest.mock("../ManualPage", () => ({ __esModule: true, default: () => null }));

describe("manual section page", () => {
	beforeEach(() => {
		mockGetTranslations.mockResolvedValue((key: string) => `msg:${key}`);
	});
	afterEach(() => jest.clearAllMocks());

	it("pré-génère chaque section dans chaque langue", () => {
		const params = generateStaticParams();
		expect(params).toHaveLength(MANUAL_SECTIONS.length * 2);
		expect(params).toContainEqual({ locale: "en", section: "grafcet" });
		expect(params).toContainEqual({ locale: "fr", section: "scene3d" });
	});

	it("lit titre et description propres à la section et pose canonical et hreflang", async () => {
		const metadata = await generateMetadata({
			params: Promise.resolve({ locale: "en", section: "grafcet" }),
		});

		expect(metadata.title).toEqual({
			absolute: "msg:manualSections.grafcet.title",
		});
		expect(metadata.description).toBe("msg:manualSections.grafcet.description");
		expect(metadata.alternates?.canonical).toBe(
			"https://studomate.com/en/user-manual/grafcet",
		);
		expect(metadata.alternates?.languages).toEqual({
			fr: "https://studomate.com/manuel-utilisateur/grafcet",
			en: "https://studomate.com/en/user-manual/grafcet",
			"x-default": "https://studomate.com/manuel-utilisateur/grafcet",
		});
	});

	it("ne produit pas de métadonnées pour l'introduction, qui redirige", async () => {
		const metadata = await generateMetadata({
			params: Promise.resolve({ locale: "fr", section: "intro" }),
		});
		expect(metadata).toEqual({});
		expect(mockGetTranslations).not.toHaveBeenCalled();
	});

	it("redirige définitivement /intro vers l'URL de base du manuel", async () => {
		await expect(
			UserManualSection({
				params: Promise.resolve({ locale: "en", section: "intro" }),
			}),
		).rejects.toThrow("NEXT_REDIRECT");
		expect(mockPermanentRedirect).toHaveBeenCalledWith("/en/user-manual");
	});

	it("a un titre et une description dans les deux langues pour chaque section hors introduction", () => {
		for (const locale of ["fr", "en"] as const) {
			const sections = (
				getMessages(locale) as {
					public: {
						metadata: { manualSections: Record<string, { title: string; description: string }> };
					};
				}
			).public.metadata.manualSections;
			for (const { id } of MANUAL_SECTIONS.filter((s) => s.id !== "intro")) {
				expect(sections[id]?.title).toBeTruthy();
				expect(sections[id]?.description).toBeTruthy();
			}
			expect(sections.intro).toBeUndefined();
		}
	});
});
