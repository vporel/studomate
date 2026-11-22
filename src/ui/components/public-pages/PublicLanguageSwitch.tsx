"use client";

import type { Locale } from "@/i18n/config";
import { Link, usePathname } from "@/i18n/navigation";
import { setPreferredLocale } from "@/persistence/preferences.storage";
import LanguageSwitch from "@/ui/components/language-switch/LanguageSwitch";
import { MenuItem } from "@mui/material";
import { useLocale } from "next-intl";
import usePublicPageHref from "./usePublicPageHref";

/**
 * Bascule de langue des pages publiques (mémorise le choix pour `/app` et l'accueil) : reste sur
 * la page courante, avec le slug traduit de l'autre langue.
 */
export default function PublicLanguageSwitch({
	pathname,
}: {
	pathname?: ReturnType<typeof usePathname>;
}) {
	const hrefFor = usePublicPageHref(pathname);
	const current = useLocale() as Locale;

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
