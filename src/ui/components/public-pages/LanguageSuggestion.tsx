import type { Locale } from "@/i18n/config";
import { getTranslations } from "next-intl/server";
import LanguageSuggestionBanner from "./LanguageSuggestionBanner";

/**
 * Banner offering the page in the other language, worded in that other language so a visitor who
 * does not read the current one can still understand it.
 */
export default async function LanguageSuggestion({
	locale,
}: {
	locale: Locale;
}) {
	const targetLocale: Locale = locale === "en" ? "fr" : "en";
	const t = await getTranslations({
		locale: targetLocale,
		namespace: "public.languageSuggestion",
	});
	return (
		<LanguageSuggestionBanner
			targetLocale={targetLocale}
			message={t("message")}
			action={t("action")}
			dismiss={t("dismiss")}
		/>
	);
}
