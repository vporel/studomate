import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

/**
 * Résout la locale des **pages publiques** (préfixe `/en/…`, slugs traduits) et réécrit vers le
 * segment interne `[locale]`. `localeDetection: false` : la racine `/` sert toujours le français,
 * l'utilisateur bascule via le sélecteur du header (pas de redirection sur `Accept-Language`,
 * pas de cookie).
 */
export default createMiddleware(routing);

export const config = {
	// Tout sauf `/app` (SPA, langue en localStorage), les routes internes Next, l'API et les
	// fichiers statiques (avec extension).
	matcher: ["/((?!app(?:/|$)|api|_next|_vercel|.*\\..*).*)"],
};
