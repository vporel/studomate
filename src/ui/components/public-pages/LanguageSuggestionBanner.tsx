"use client";

import { detectBrowserLocale, type Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import {
	getLanguageSuggestionDismissed,
	getPreferredLocale,
	setLanguageSuggestionDismissed,
	setPreferredLocale,
} from "@/persistence/preferences.storage";
import CloseIcon from "@mui/icons-material/Close";
import { Button, IconButton, Paper, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import usePublicPageHref from "./usePublicPageHref";

/**
 * Offers the current public page in `targetLocale`, in that language, when the browser asks for
 * it and the visitor never chose a language. Shown after mounting only, as a fixed overlay: the
 * server HTML and the layout are the same for every visitor, crawlers included.
 */
export default function LanguageSuggestionBanner({
	targetLocale,
	message,
	action,
	dismiss,
}: {
	targetLocale: Locale;
	message: string;
	action: string;
	dismiss: string;
}) {
	const hrefFor = usePublicPageHref();
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		setVisible(
			getPreferredLocale() === null &&
				!getLanguageSuggestionDismissed() &&
				detectBrowserLocale() === targetLocale,
		);
	}, [targetLocale]);

	if (!visible) return null;
	return (
		<Paper
			elevation={6}
			lang={targetLocale}
			role="region"
			aria-label={message}
			sx={{
				position: "fixed",
				left: 16,
				right: 16,
				bottom: 16,
				zIndex: (theme) => theme.zIndex.snackbar,
				maxWidth: 440,
				display: "flex",
				alignItems: "center",
				gap: 1,
				py: 1,
				pl: 2,
				pr: 1,
			}}
		>
			<Typography variant="body2" sx={{ flex: 1 }}>
				{message}
			</Typography>
			<Button
				component={Link}
				href={hrefFor(targetLocale)}
				locale={targetLocale}
				size="small"
				onClick={() => setPreferredLocale(targetLocale)}
			>
				{action}
			</Button>
			<IconButton
				size="small"
				aria-label={dismiss}
				title={dismiss}
				onClick={() => {
					setLanguageSuggestionDismissed();
					setVisible(false);
				}}
			>
				<CloseIcon fontSize="small" />
			</IconButton>
		</Paper>
	);
}
