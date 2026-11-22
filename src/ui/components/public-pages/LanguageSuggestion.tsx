import { LOCALES, type Locale } from "@/i18n/config";
import { getTranslations } from "next-intl/server";
import LanguageSuggestionBanner, {
	type LanguageSuggestionTexts,
} from "./LanguageSuggestionBanner";

/**
 * Banner offering the page in the visitor's browser language when it differs from the page's.
 * Each suggestion is worded in its own language so a visitor who does not read the current one
 * can still understand it.
 */
export default async function LanguageSuggestion({
	locale,
}: {
	locale: Locale;
}) {
	const others = LOCALES.filter((l) => l !== locale);
	const entries = await Promise.all(
		others.map(async (target) => {
			const t = await getTranslations({
				locale: target,
				namespace: "public.languageSuggestion",
			});
			const texts: LanguageSuggestionTexts = {
				message: t("message"),
				action: t("action"),
				dismiss: t("dismiss"),
			};
			return [target, texts] as const;
		}),
	);
	return <LanguageSuggestionBanner suggestions={Object.fromEntries(entries)} />;
}
