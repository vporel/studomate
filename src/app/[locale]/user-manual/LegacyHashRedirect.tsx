"use client";

import type { Locale } from "@/i18n/config";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import manualPath from "./manual-path";
import { MANUAL_DEFAULT_SECTION } from "./manual-sections";

/**
 * Redirige les anciens liens `/manuel-utilisateur#<section>` vers la page de la section : le
 * fragment n'est pas lisible côté serveur.
 */
export default function LegacyHashRedirect() {
	const locale = useLocale() as Locale;
	const router = useRouter();

	useEffect(() => {
		const id = window.location.hash.slice(1);
		if (!id || id === MANUAL_DEFAULT_SECTION) return;
		const path = manualPath(locale, id);
		if (path) router.replace(path);
	}, [locale, router]);

	return null;
}
