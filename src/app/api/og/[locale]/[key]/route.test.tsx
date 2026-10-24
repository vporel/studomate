import { LOCALES } from "@/i18n/config";
import { OG_IMAGE_KEYS } from "@/app/og-image";
import { GET, generateStaticParams } from "./route";

const mockImageResponse = jest.fn();
jest.mock("next/og", () => ({
	ImageResponse: class {
		constructor(...args: unknown[]) {
			mockImageResponse(...args);
			return new Response("png", { headers: { "content-type": "image/png" } });
		}
	},
}));

describe("og image route", () => {
	beforeEach(() => mockImageResponse.mockClear());

	it("pre-generates every family in every locale", () => {
		const params = generateStaticParams();

		expect(params).toHaveLength(LOCALES.length * OG_IMAGE_KEYS.length);
		expect(params).toContainEqual({ locale: "fr", key: "a1" });
		expect(params).toContainEqual({ locale: "en", key: "manual" });
	});

	it("draws the title of the family at the share size", async () => {
		const response = await GET(new Request("http://localhost/api/og/fr/a1"), {
			params: Promise.resolve({ locale: "fr", key: "a1" }),
		});

		expect(response.status).toBe(200);
		expect(response.headers.get("content-type")).toBe("image/png");
		expect(mockImageResponse).toHaveBeenCalledTimes(1);
		const [element, options] = mockImageResponse.mock.calls[0];
		expect(options).toEqual({ width: 1200, height: 630 });
		expect(JSON.stringify(element)).toContain("Module A1 : Bases du GRAFCET");
	});

	it("draws the title in the requested locale", async () => {
		await GET(new Request("http://localhost/api/og/en/training"), {
			params: Promise.resolve({ locale: "en", key: "training" }),
		});

		expect(JSON.stringify(mockImageResponse.mock.calls[0][0])).toContain(
			"Free GRAFCET and Ladder training",
		);
	});

	it.each([
		{ locale: "de", key: "a1" },
		{ locale: "fr", key: "nope" },
	])("answers 404 for %o", async (params) => {
		const response = await GET(new Request("http://localhost/api/og/x/y"), {
			params: Promise.resolve(params),
		});

		expect(response.status).toBe(404);
		expect(mockImageResponse).not.toHaveBeenCalled();
	});
});
