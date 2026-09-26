import { createGenerateMetadata } from "./metadata";

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
		expect(metadata.openGraph?.title).toBe("msg:aboutTitle");
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
			expect.arrayContaining(["fr", "en"]),
		);
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
