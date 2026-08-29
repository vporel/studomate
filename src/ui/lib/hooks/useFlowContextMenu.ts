"use client";

import { Emitter } from "mitt";
import React, { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";

/**
 * Factorise le pattern commun d'ouverture du menu contextuel dans les flows ReactFlow :
 * traduit les coordonnées du clic (clientX/Y) en position flow via `screenToFlowPosition`,
 * puis émet l'événement `show` sur le bus mitt fourni.
 *
 * Le guard optionnel `canOpen` permet à chaque flow d'ajouter ses propres conditions
 * (ex. vérification du mode DESIGN, appartenance à une section).
 */
export default function useFlowContextMenu<TElement>(
	contextMenuEvents: Emitter<any>,
	canOpen?: (element: TElement) => boolean,
) {
	const { screenToFlowPosition } = useReactFlow();

	const openContextMenu = useCallback(
		(event: React.MouseEvent | MouseEvent, element: TElement) => {
			event.preventDefault();
			if (canOpen && !canOpen(element)) return;
			contextMenuEvents.emit("show", {
				element,
				position: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
				//Coordonnées écran brutes : le collage (grafcet/ladder) en a besoin tel quel
				//(`elementsFromPoint`, `rfInstance.screenToFlowPosition`).
				screenPosition: { x: event.clientX, y: event.clientY },
			});
		},
		[contextMenuEvents, screenToFlowPosition, canOpen],
	);

	const closeContextMenu = useCallback(() => {
		contextMenuEvents.emit("hide");
	}, [contextMenuEvents]);

	return { openContextMenu, closeContextMenu };
}
