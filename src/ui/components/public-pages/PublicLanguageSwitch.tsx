"use client";

import type { Locale } from "@/i18n/config";
import { Link, usePathname } from "@/i18n/navigation";
import { manualIdFromSlug, manualSlug } from "@/i18n/manual-slugs";
import { setPreferredLocale } from "@/persistence/preferences.storage";
import LanguageSwitch from "@/ui/components/language-switch/LanguageSwitch";
import { MenuItem } from "@mui/material";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";

/**
 * Bascule de langue des pages publiques (mémorise le choix pour `/app` et l'accueil) : reste sur la page courante (`usePathname` renvoie le
 * chemin interne, `Link` avec `locale` le réécrit vers le slug traduit de l'autre langue).
 * Si la route est dynamique mais que ses paramètres manquent (page introuvable sur un slug
 * inconnu), la bascule renvoie à l'accueil. Le slug d'une section du manuel est traduit pour
 * chaque langue cible.
 */
export default function PublicLanguageSwitch({
	pathname,
}: {
	pathname?: ReturnType<typeof usePathname>;
}) {
	const currentPathname = usePathname();
	const target = pathname ?? currentPathname;
	const params = useParams();
	const paramNames = Array.from(target.matchAll(/\[(\w+)\]/g), (m) => m[1]);
	const hasAllParams = paramNames.every((name) => name in params);
	const current = useLocale() as Locale;
	const hrefFor = (locale: Locale) => {
		if (paramNames.length === 0) return target as "/";
		if (!hasAllParams) return "/";
		if (target === "/user-manual/[section]") {
			const id = manualIdFromSlug(current, params.section as string);
			if (!id) return "/";
			return {
				pathname: target,
				params: { ...params, section: manualSlug(locale, id) },
			} as unknown as "/";
		}
		return { pathname: target, params } as unknown as "/";
	};

	return (
		<LanguageSwitch
			current={current}
			renderItem={(locale, { label, selected, close }) => (
				<MenuItem
					key={locale}
					component={Link}
					href={hrefFor(locale)}
					locale={locale}
					selected={selected}
					onClick={() => {
						setPreferredLocale(locale);
						close();
					}}
				>
					{label}
				</MenuItem>
			)}
		/>
	);
}
