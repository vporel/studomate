import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
	output: "standalone",
};

export default withSentryConfig(withNextIntl(nextConfig), {
	silent: true,
	// Désactive l'upload des source maps si la variable n'est pas définie
	disableLogger: true,
	widenClientFileUpload: true,
});
