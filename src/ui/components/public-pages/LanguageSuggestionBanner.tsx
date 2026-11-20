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

export type LanguageSuggestionTexts = {
	message: string;
	action: string;
	dismiss: string;
};

/**
 * Offers the current public page in the browser's language, worded in that language, when it
 * differs from the page's and the visitor never chose a language. `suggestions` holds the texts of
 * every language other than the page's. Shown after mounting only, as a fixed overlay: the server
 * HTML and the layout are the same for every visitor, crawlers included.
 */
export default function LanguageSuggestionBanner({
	suggestions,
}: {
	suggestions: Partial<Record<Locale, LanguageSuggestionTexts>>;
}) {
	const hrefFor = usePublicPageHref();
	const [targetLocale, setTargetLocale] = useState<Locale | null>(null);

	useEffect(() => {
		const browserLocale = detectBrowserLocale();
		setTargetLocale(
			getPreferredLocale() === null &&
				!getLanguageSuggestionDismissed() &&
				suggestions[browserLocale]
				? browserLocale
				: null,
		);
	}, [suggestions]);

	const texts = targetLocale ? suggestions[targetLocale] : undefined;
	if (!targetLocale || !texts) return null;
	const { message, action, dismiss } = texts;
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
					setTargetLocale(null);
				}}
			>
				<CloseIcon fontSize="small" />
			</IconButton>
		</Paper>
	);
}
