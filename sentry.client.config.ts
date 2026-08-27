import * as Sentry from "@sentry/nextjs";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	// Désactivé si la variable n'est pas définie (dev local sans .env.local configuré)
	enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
	tracesSampleRate: 0.1,
	// Réduit le bruit en ignorant les erreurs navigateur non actionnables
	ignoreErrors: [
		"ResizeObserver loop limit exceeded",
		"ResizeObserver loop completed with undelivered notifications",
	],
});
