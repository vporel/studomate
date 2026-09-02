import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

/**
 * Traducteur factice pour les tests de fonctions pures qui reçoivent un `t` en paramètre
 * (menus contextuels, etc.) : renvoie la clé (plus les valeurs interpolées) au lieu du texte.
 */
export function identityT(
	key: string,
	values?: Record<string, string | number>,
): string {
	return values ? `${key} ${Object.values(values).join(" ")}` : key;
}

/**
 * Wrapper `NextIntlClientProvider` (locale `fr` par défaut) — à passer à `render` /
 * `renderHook` pour tout composant ou hook qui consomme `useT` / `useTranslations`.
 */
export function i18nWrapper(locale: Locale = DEFAULT_LOCALE) {
	const Wrapper = ({ children }: { children: ReactNode }) => (
		<NextIntlClientProvider locale={locale} messages={getMessages(locale)}>
			{children}
		</NextIntlClientProvider>
	);
	Wrapper.displayName = "I18nTestWrapper";
	return Wrapper;
}

/**
 * Rend un composant sous un `NextIntlClientProvider` (locale `fr` par défaut) pour les tests
 * de composants qui consomment `useT` / `useTranslations`.
 */
export function renderWithI18n(
	ui: ReactElement,
	{ locale = DEFAULT_LOCALE, ...options }: { locale?: Locale } & RenderOptions = {},
): RenderResult {
	return render(ui, { wrapper: i18nWrapper(locale), ...options });
}
