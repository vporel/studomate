"use client";

import { getTimerBlockParams } from "@/schemas/function-blocks/timer.schema";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useGotoProgram from "@/ui/components/projects/useGotoProgram";
import { ContextMenuItemType } from "@/ui/lib/context-menu/context-menu";
import { useCallback } from "react";

/**
 * Menu contextuel d'une instance de bloc système (voir `ExplorerSystemBlockInstancesItems`) —
 * "Paramétrer" ouvre la même fenêtre de configuration que le double-clic sur le bloc dans le
 * canevas (`LadderWorkflowManager.openSystemBlockEditor`), après avoir ouvert/activé la page du
 * ladder ciblé — le délai est le même que celui d'`useGotoProgram` pour la mise en surbrillance :
 * le store du ladder doit d'abord devenir actif.
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
							const located = project?.getLadder(ladderId)?.findElement(elementId);
							const initial =
								located?.element.type === "block" ? getTimerBlockParams(located.element) : null;
							if (!initial) return;

							onGotoProgram(ladderId, "ladder");
							setTimeout(() => {
								laddersManager.getActiveStoreManagers()?.workflowManager.openSystemBlockEditor(elementId, initial);
							}, 100);
						},
					},
				],
			];
		},
		[project, laddersManager, onGotoProgram],
	);
}
