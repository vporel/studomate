import * as Sentry from "@sentry/nextjs";

import { isProdEnv } from "@/app-env";

Sentry.init({
	dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
	enabled: isProdEnv && !!process.env.NEXT_PUBLIC_SENTRY_DSN,
	tracesSampleRate: 0.1,
});
