"use client";

import { useTranslations } from "next-intl";

/**
 * Accès aux traductions de l'interface. Alias de `useTranslations` de `next-intl` : un seul
 * point d'import dans l'app, et la possibilité de changer d'implémentation sans toucher les
 * composants.
 *
 * ```ts
 * const t = useT("preferences");
 * t("heading");
 * ```
 */
export const useT = useTranslations;
