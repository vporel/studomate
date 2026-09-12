"use client";

import { LOCALES, type Locale } from "@/i18n/config";
import { Link, usePathname } from "@/i18n/navigation";
import { useT } from "@/ui/i18n/useT";
import LanguageIcon from "@mui/icons-material/Language";
import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import { useLocale } from "next-intl";
import { useState } from "react";

/**
 * Bascule de langue des pages publiques : reste sur la page courante (`usePathname` renvoie le
 * chemin interne, `Link` avec `locale` le réécrit vers le slug traduit de l'autre langue).
 */
export default function LanguageSwitch({
	pathname,
}: {
	pathname?: ReturnType<typeof usePathname>;
}) {
	const currentPathname = usePathname();
	const target = pathname ?? currentPathname;
	const current = useLocale() as Locale;
	const t = useT("public.languageSwitch");
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

	return (
		<Box>
			<IconButton
				aria-label={t("label")}
				onClick={(e) => setAnchorEl(e.currentTarget)}
				size="small"
			>
				<LanguageIcon fontSize="small" />
			</IconButton>
			<Menu
				anchorEl={anchorEl}
				open={!!anchorEl}
				onClose={() => setAnchorEl(null)}
			>
				{LOCALES.map((locale) => (
					<MenuItem
						key={locale}
						component={Link}
						href={target}
						locale={locale}
						selected={locale === current}
						onClick={() => setAnchorEl(null)}
					>
						{t(locale)}
					</MenuItem>
				))}
			</Menu>
		</Box>
	);
}
