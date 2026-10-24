"use client";

import { DEFAULT_LOCALE } from "@/i18n/config";
import { useRouter } from "@/i18n/navigation";
import { getPreferredLocale } from "@/persistence/preferences.storage";
import { useLocale } from "next-intl";
import { useEffect } from "react";

/**
 * Sends a visitor of the unprefixed home (`/`) to the home of the language they chose earlier.
 * Prefixed URLs are explicit and never overridden.
 */
export default function PreferredLocaleRedirect() {
	const locale = useLocale();
	const router = useRouter();

	useEffect(() => {
		if (locale !== DEFAULT_LOCALE) return;
		const preferred = getPreferredLocale();
		if (preferred && preferred !== locale) {
			router.replace("/", { locale: preferred });
		}
	}, [locale, router]);

	return null;
}
