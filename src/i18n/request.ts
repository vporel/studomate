import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE } from "./config";
import { getMessages } from "./messages";
import { routing } from "./routing";

/**
 * Configuration par requête pour les Server Components des pages publiques (`src/app/[locale]/`).
 * L'app `/app` n'en dépend pas : elle monte `NextIntlClientProvider` côté client
 * (`LocaleProvider`) avec la locale de `localStorage`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale;
	const locale = hasLocale(routing.locales, requested)
		? requested
		: DEFAULT_LOCALE;

	return { locale, messages: getMessages(locale) };
});
