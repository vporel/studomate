import { getMessages } from "@/i18n/messages";
import { MANUAL_SECTIONS } from "../manual-sections";
import { generateMetadata, generateStaticParams } from "./page";
import UserManualSection from "./page";

const mockGetTranslations = jest.fn();
const mockNotFound = jest.fn(() => {
	throw new Error("NEXT_NOT_FOUND");
});

jest.mock("next-intl/server", () => ({
	getTranslations: (...args: unknown[]) => mockGetTranslations(...args),
	setRequestLocale: jest.fn(),
}));
jest.mock("next/navigation", () => ({
	notFound: () => mockNotFound(),
}));
jest.mock("../ManualPage", () => ({ __esModule: true, default: () => null }));

describe("manual section page", () => {
	beforeEach(() => {
		mockGetTranslations.mockResolvedValue((key: string) => `msg:${key}`);
	});
	afterEach(() => jest.clearAllMocks());

	it("pré-génère chaque section hors introduction dans chaque langue, avec son slug traduit", () => {
		const params = generateStaticParams();
		expect(params).toHaveLength((MANUAL_SECTIONS.length - 1) * 2);
		expect(params).toContainEqual({ locale: "en", section: "grafcet" });
		expect(params).toContainEqual({ locale: "fr", section: "scene-3d" });
		expect(params).toContainEqual({ locale: "fr", section: "depannage" });
		expect(params).not.toContainEqual({ locale: "fr", section: "troubleshooting" });
		expect(params).not.toContainEqual({ locale: "fr", section: "intro" });
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

	it("pose des hreflang avec le slug propre à chaque langue", async () => {
		const metadata = await generateMetadata({
			params: Promise.resolve({ locale: "fr", section: "depannage" }),
		});

		expect(mockGetTranslations).toHaveBeenCalledWith(
			expect.objectContaining({ namespace: "public.metadata" }),
		);
		expect(metadata.description).toBe(
			"msg:manualSections.troubleshooting.description",
		);
		expect(metadata.alternates?.canonical).toBe(
			"https://studomate.com/manuel-utilisateur/depannage",
		);
		expect(metadata.alternates?.languages).toEqual({
			fr: "https://studomate.com/manuel-utilisateur/depannage",
			en: "https://studomate.com/en/user-manual/troubleshooting",
			"x-default": "https://studomate.com/manuel-utilisateur/depannage",
		});
	});

	it("ne produit pas de métadonnées pour un slug inconnu dans la langue", async () => {
		for (const section of ["intro", "troubleshooting"]) {
			const metadata = await generateMetadata({
				params: Promise.resolve({ locale: "fr", section }),
			});
			expect(metadata).toEqual({});
		}
		expect(mockGetTranslations).not.toHaveBeenCalled();
	});

	it("répond 404 sur un slug inconnu dans la langue, dont l'ancien identifiant", async () => {
		await expect(
			UserManualSection({
				params: Promise.resolve({ locale: "fr", section: "troubleshooting" }),
			}),
		).rejects.toThrow("NEXT_NOT_FOUND");
	});

	it("fournit un fil d'Ariane Manuel > section avec le titre de la section", async () => {
		mockGetTranslations.mockResolvedValue(
			(key: string) => `msg:${key}`,
		);
		const page = (await UserManualSection({
			params: Promise.resolve({ locale: "fr", section: "depannage" }),
		})) as {
			props: { children: { props: { breadcrumb: { props: Record<string, unknown> } } } };
		};

		const { ancestors, current, locale } = page.props.children.props.breadcrumb.props;
		expect(locale).toBe("fr");
		expect(ancestors).toEqual([{ label: "msg:pageTitle", href: "/user-manual" }]);
		expect(current).toMatchObject({ label: "msg:troubleshooting" });
	});

	it("rend la section désignée par un slug traduit", async () => {
		await expect(
			UserManualSection({
				params: Promise.resolve({ locale: "fr", section: "depannage" }),
			}),
		).resolves.toBeTruthy();
		expect(mockNotFound).not.toHaveBeenCalled();
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
