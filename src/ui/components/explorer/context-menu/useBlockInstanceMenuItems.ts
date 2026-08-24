"use client";

import { getCounterBlockParams } from "@/schemas/function-blocks/counter.schema";
import { getTimerBlockParams } from "@/schemas/function-blocks/timer.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useGotoProgram from "@/ui/components/projects/useGotoProgram";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";

/** Nombre de tentatives et intervalle du polling qui attend que le manager du ladder ciblé
 * devienne actif après `pagesManager.openPage` (voir `useBlockInstanceMenuItems`) — 500 ms au
 * total, largement au-dessus du temps de montage observé en pratique, sans bloquer indéfiniment
 * si la page n'active jamais son manager (onglet fermé entretemps, etc.). */
const OPEN_EDITOR_MAX_ATTEMPTS = 25;
const OPEN_EDITOR_RETRY_INTERVAL_MS = 20;

/**
 * Menu contextuel d'une instance de bloc système (voir `ExplorerSystemBlockInstancesItems`) —
 * "Paramétrer" ouvre la même fenêtre de configuration que le double-clic sur le bloc dans le
 * canevas (`LadderWorkflowManager.openSystemBlockEditor`), après avoir ouvert/activé la page du
 * ladder ciblé. `pagesManager.openPage` ne rend pas la page active de façon synchrone (montage
 * React) : on attend par polling plutôt qu'un délai fixe, qui échouerait silencieusement si le
 * montage prend occasionnellement plus longtemps que prévu.
 */
export default function useBlockInstanceMenuItems(): (
	ladderId: string,
	elementId: string,
) => ContextMenuItemType[][] {
	const project = useProjectStore((state) => state.project);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const onGotoProgram = useGotoProgram();

	return useCallback(
		(ladderId: string, elementId: string) => {
			return [
				[
					{
						label: "Ouvrir",
						onClick: () => onGotoProgram(ladderId, "ladder", elementId),
					},
				],
				[
					{
						label: "Paramétrer",
						onClick: () => {
							const element = project?.getLadder(ladderId)?.findElement(elementId)?.element;
							const timerParams = element?.type === "block" ? getTimerBlockParams(element) : null;
							const counterParams = element?.type === "block" ? getCounterBlockParams(element) : null;
							if (!timerParams && !counterParams) return;

							onGotoProgram(ladderId, "ladder");
							let attempts = 0;
							const tryOpenEditor = () => {
								const workflowManager = laddersManager.getActiveStoreManagers()?.workflowManager;
								if (workflowManager) {
									if (timerParams) workflowManager.openSystemBlockEditor(elementId, "timer", timerParams);
									else if (counterParams)
										workflowManager.openSystemBlockEditor(elementId, "counter", counterParams);
									return;
								}
								attempts += 1;
								if (attempts < OPEN_EDITOR_MAX_ATTEMPTS) {
									setTimeout(tryOpenEditor, OPEN_EDITOR_RETRY_INTERVAL_MS);
								}
							};
							setTimeout(tryOpenEditor, OPEN_EDITOR_RETRY_INTERVAL_MS);
						},
					},
				],
			];
		},
		[project, laddersManager, onGotoProgram],
	);
}
