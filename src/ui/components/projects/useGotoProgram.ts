import { useCallback } from "react";
import type { PageData } from "@/ui/stores/project/project.store.types";
import { useProjectStore } from "./ProjectContext";

/**
 * Ouvre un programme (grafcet/ladder) et, si un élément est précisé, le met temporairement en
 * surbrillance une fois la page active — le `setTimeout` laisse le temps au manager de la page
 * cible de devenir actif (`getActiveStoreManagers` ne retourne que les managers de la page
 * courante).
 *
 * @param openPage Ouvre la page du programme et dit si elle l'est : par défaut elle s'ajoute aux
 * onglets ; un appelant dont les onglets sont fixes peut se contenter de sélectionner l'existant.
 */
export default function useGotoProgram(
	openPage?: (pageData: PageData) => boolean,
) {
	const project = useProjectStore((s) => s.project);
	const grafcetsManager = useProjectStore((s) => s.grafcetsManager);
	const laddersManager = useProjectStore((s) => s.laddersManager);
	const pagesManager = useProjectStore((s) => s.pagesManager);

	return useCallback(
		(
			programId: string,
			programType: "grafcet" | "ladder",
			elementId?: string,
		) => {
			const name =
				programType === "grafcet"
					? (project?.getGrafcet(programId)?.name ?? "Nom inconnu")
					: (project?.getLadder(programId)?.name ?? "Nom inconnu");
			const pageData: PageData = {
				type: programType,
				id: programId,
				title: name,
			};
			if (openPage) {
				if (!openPage(pageData)) return;
			} else {
				pagesManager.openPage(pageData);
			}

			if (elementId) {
				setTimeout(() => {
					const managers =
						programType === "grafcet"
							? grafcetsManager.getActiveStoreManagers()
							: laddersManager.getActiveStoreManagers();
					if (!managers) return;
					managers.viewManager.temporarilyHighlightNodesAndEdges(
						[elementId],
						[],
						3000,
					);
				}, 100);
			}
		},
		[project, grafcetsManager, laddersManager, pagesManager, openPage],
	);
}
