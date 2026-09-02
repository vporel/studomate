"use client";

import { useT } from "@/ui/i18n/useT";
import type { PageData } from "@/ui/stores/project/project.store";

/**
 * Libellé affiché pour une page. Les pages « système » (préférences, propriétés, énoncé,
 * démarrage, tables de variables) ont un titre fixe traduit par type/id ; pour les pages de
 * programme (grafcet, ladder, HMI) le titre est le nom du programme, saisi par l'utilisateur,
 * et reste tel quel.
 */
export function usePageTitle() {
	const t = useT("pages.titles");

	return (page: Pick<PageData, "id" | "type" | "title">): string => {
		switch (page.type) {
			case "preferences":
				return t("preferences");
			case "project-properties":
				return t("projectProperties");
			case "exercise":
				return t("exercise");
			case "project-startup":
				return t("projectStartup");
			case "variables":
				if (page.id === "input-variables") return t("inputVariables");
				if (page.id === "output-variables") return t("outputVariables");
				return t("memoryVariables");
			default:
				return page.title;
		}
	};
}
