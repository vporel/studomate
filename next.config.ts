import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { withSerwist } from "@serwist/turbopack";
import createNextIntlPlugin from "next-intl/plugin";
import { APP_URL } from "./src/app-info";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
	output: "standalone",
	experimental: { globalNotFound: true },
	async headers() {
		return [
			{
				source: "/app",
				has: [{ type: "query" as const, key: "template" }],
				headers: [{ key: "X-Robots-Tag", value: "noindex" }],
			},
		];
	},
	async redirects() {
		return [
			{
				source: "/:path*",
				has: [{ type: "host", value: `www.${new URL(APP_URL).host}` }],
				destination: `${APP_URL}/:path*`,
				permanent: true,
			},
			{
				source: "/:path*",
				has: [{ type: "header", key: "x-forwarded-proto", value: "http" }],
				destination: `${APP_URL}/:path*`,
				permanent: true,
			},
		];
	},
};

export default withSentryConfig(withSerwist(withNextIntl(nextConfig)), {
	silent: true,
	// Désactive l'upload des source maps si la variable n'est pas définie
	disableLogger: true,
	widenClientFileUpload: true,
});
