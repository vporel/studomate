"use client";

import { LOCALES, type Locale } from "@/i18n/config";
import { useT } from "@/ui/i18n/useT";
import LanguageIcon from "@mui/icons-material/Language";
import { Box, Button, Menu } from "@mui/material";
import { useState, type ReactElement } from "react";

type LanguageItemContext = {
	label: string;
	selected: boolean;
	close: () => void;
};

type LanguageSwitchProps = {
	current: Locale;
	/** Menu item for `locale`: what picking it does (link, state change...) is up to the caller. */
	renderItem: (locale: Locale, context: LanguageItemContext) => ReactElement;
};

export default function LanguageSwitch({
	current,
	renderItem,
}: LanguageSwitchProps) {
	const t = useT("common.languageSwitch");
	const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
	const close = () => setAnchorEl(null);

	return (
		<Box>
			<Button
				aria-label={t("label")}
				onClick={(e) => setAnchorEl(e.currentTarget)}
				size="small"
				color="inherit"
				startIcon={<LanguageIcon fontSize="small" />}
				sx={{ minWidth: 0, px: 1 }}
			>
				{current.toUpperCase()}
			</Button>
			<Menu keepMounted anchorEl={anchorEl} open={!!anchorEl} onClose={close}>
				{LOCALES.map((locale) =>
					renderItem(locale, {
						label: t(locale),
						selected: locale === current,
						close,
					}),
				)}
			</Menu>
		</Box>
	);
}
