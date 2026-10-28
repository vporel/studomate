"use client";

import { isStandaloneDisplay } from "@/ui/lib/platform";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Fab } from "@mui/material";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/** The Navigation API is exact but Chromium-only; the history length is the fallback. */
function canGoBack(): boolean {
	const navigation = (window as { navigation?: { canGoBack: boolean } })
		.navigation;
	return navigation ? navigation.canGoBack : window.history.length > 1;
}

/**
 * Back button for the public pages of an installed app, whose window has no browser toolbar.
 * Hidden in a regular tab and while there is nothing to go back to (a window opened directly on
 * a page).
 */
export default function StandaloneBackButton() {
	const t = useTranslations("public.header");
	const pathname = usePathname();
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(isStandaloneDisplay() && canGoBack());
	}, [pathname]);

	if (!visible) return null;
	return (
		<Fab
			size="small"
			color="primary"
			aria-label={t("back")}
			title={t("back")}
			onClick={() => window.history.back()}
			sx={{ position: "fixed", left: 16, bottom: 16 }}
		>
			<ArrowBackIcon />
		</Fab>
	);
}
