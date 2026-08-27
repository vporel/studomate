import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
	output: "standalone",
};

export default withSentryConfig(nextConfig, {
	silent: true,
	// Désactive l'upload des source maps si la variable n'est pas définie
	disableLogger: true,
	widenClientFileUpload: true,
});
