import { getMessages } from "@/i18n/messages";
import { resolveUiLocale } from "@/persistence/preferences.storage";
import { createTranslator } from "next-intl";

/**
 * Traducteur pour le code **hors React** (managers zustand, notifiers) : lit la langue
 * effective (`localStorage`, repli navigateur) et rend via `createTranslator` de `next-intl`.
 * Dans un composant, utiliser `useT` à la place.
 *
 * `namespace` accepte un chemin pointé (`"toasts.save"`).
 */
export function getT(
	namespace: string,
): (key: string, values?: Record<string, string | number>) => string {
	const locale = resolveUiLocale();
	const translator = createTranslator({
		locale,
		messages: getMessages(locale),
	
		namespace: namespace as any,
	});
	return (key, values) => (translator as any)(key, values);
}
