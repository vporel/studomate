import * as Sentry from "@sentry/nextjs";

import { isProdEnv } from "@/app-env";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	// Désactivé en dev et si la variable DSN n'est pas définie
	enabled: isProdEnv && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
	tracesSampleRate: 0.1,
	// Réduit le bruit en ignorant les erreurs navigateur non actionnables
	ignoreErrors: [
		"ResizeObserver loop limit exceeded",
		"ResizeObserver loop completed with undelivered notifications",
	],
});
