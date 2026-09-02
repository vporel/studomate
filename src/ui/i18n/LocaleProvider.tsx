"use client";

import {
	DEFAULT_LOCALE,
	detectBrowserLocale,
	type Locale,
} from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import {
	getPreferredLocale,
	setPreferredLocale,
} from "@/persistence/preferences.storage";
import { NextIntlClientProvider } from "next-intl";
import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

type LocaleContextValue = {
	locale: Locale;
	setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
	locale: DEFAULT_LOCALE,
	setLocale: () => {},
});

/**
 * Fournit la langue de l'interface à l'arbre `/app`. La langue n'est pas dans l'URL (l'app est
 * un SPA sans enjeu SEO) : elle vient de `localStorage`, avec repli sur la langue du navigateur.
 *
 * Le premier rendu utilise `DEFAULT_LOCALE` pour correspondre à la sortie prérendue côté
 * serveur ; la préférence réelle est appliquée juste après le montage.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
	const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

	useEffect(() => {
		const preferred = getPreferredLocale() ?? detectBrowserLocale();
		if (preferred !== locale) setLocaleState(preferred);
		// Volontairement une seule fois au montage : les changements ultérieurs passent par
		// `setLocale`.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		document.documentElement.lang = locale;
	}, [locale]);

	const value = useMemo<LocaleContextValue>(
		() => ({
			locale,
			setLocale: (next: Locale) => {
				setPreferredLocale(next);
				setLocaleState(next);
			},
		}),
		[locale],
	);

	return (
		<LocaleContext.Provider value={value}>
			<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
				{children}
			</NextIntlClientProvider>
		</LocaleContext.Provider>
	);
}

export const useLocaleContext = () => useContext(LocaleContext);
