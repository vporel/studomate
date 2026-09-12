/**
 * Langues de l'interface. Distinct de `Dialect` (`src/expression-language/dialect.enum.ts`),
 * qui n'affecte que la façon d'écrire les expressions d'un projet et voyage avec lui : la
 * langue ci-dessous est une préférence de l'utilisateur, elle ne touche jamais les données
 * persistées.
 */
export const LOCALES = ["fr", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** Restreint une valeur de segment d'URL à une `Locale`, repli sur `DEFAULT_LOCALE`. */
export function toLocale(value: string): Locale {
	return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Locale déduite de la langue du navigateur, repli sur `DEFAULT_LOCALE`. Utilisée à la
 * première visite, tant que l'utilisateur n'a pas fait de choix explicite.
 */
export function detectBrowserLocale(): Locale {
	if (typeof navigator === "undefined") return DEFAULT_LOCALE;
	const candidates = [
		navigator.language,
		...(navigator.languages ?? []),
	];
	for (const candidate of candidates) {
		const base = candidate?.toLowerCase().split("-")[0];
		if (isLocale(base)) return base;
	}
	return DEFAULT_LOCALE;
}
