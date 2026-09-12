/**
 * Mesure d'audience via Umami. Le script n'est chargé que si
 * `NEXT_PUBLIC_UMAMI_SRC` et `NEXT_PUBLIC_UMAMI_WEBSITE_ID` sont définis et que
 * l'application tourne en `prod` (voir `RootLayout`) ; sans lui, `trackEvent`
 * est un no-op silencieux.
 */

import { isProdEnv } from "@/app-env";

type UmamiTracker = {
	track: (eventName: string, eventData?: Record<string, unknown>) => void;
};

declare global {
	interface Window {
		umami?: UmamiTracker;
	}
}

export const UMAMI_SRC = process.env.NEXT_PUBLIC_UMAMI_SRC;
export const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export const analyticsEnabled = isProdEnv && Boolean(UMAMI_SRC && UMAMI_WEBSITE_ID);

export default function trackEvent(
	eventName: string,
	eventData?: Record<string, unknown>,
): void {
	if (typeof window === "undefined") return;
	window.umami?.track(eventName, eventData);
}
