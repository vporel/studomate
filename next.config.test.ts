jest.mock("@sentry/nextjs", () => ({ withSentryConfig: (c: unknown) => c }));
jest.mock("@serwist/turbopack", () => ({ withSerwist: (c: unknown) => c }));
jest.mock("next-intl/plugin", () => () => (c: unknown) => c);

import nextConfig from "./next.config";

describe("next.config redirects", () => {
	it("redirects www and plain-http requests permanently to the canonical origin", async () => {
		const redirects = await (nextConfig as any).redirects();

		expect(redirects).toEqual([
			expect.objectContaining({
				has: [{ type: "host", value: "www.studomate.com" }],
				destination: "https://studomate.com/:path*",
				permanent: true,
			}),
			expect.objectContaining({
				has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
				destination: "https://studomate.com/:path*",
				permanent: true,
			}),
		]);
	});
});
