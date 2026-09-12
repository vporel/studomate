/**
 * Environnement de déploiement de l'application, piloté par `NEXT_PUBLIC_APP_ENV`
 * (`dev` ou `prod`). Le préfixe `NEXT_PUBLIC_` est nécessaire : la valeur est lue
 * côté navigateur (Sentry, Umami). Toute valeur autre que `prod` est traitée
 * comme du développement.
 */

export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV === "prod" ? "prod" : "dev";

export const isProdEnv = APP_ENV === "prod";
