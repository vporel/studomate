"use client";

import { SystemBlockType } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import React from "react";
import DraggableToolCell from "./DraggableToolCell";

/**
 * Outil de dépose pour un bloc système (compare, assign, arithmetic) — même geste que `LadderTool`
 * (glisser-déposer une icône vers le canevas), mais porte le glissement en `DataTransfer` natif
 * plutôt que par le contexte React `LadderToolbarDnDContext` : c'est le même mécanisme que la
 * section "Bibliothèque" de l'explorateur (voir `ExplorerSystemBlocksItems`), pour que
 * `useLadderDropHandlers` déclenche exactement le même comportement (insertion directe d'un bloc
 * vide, configuré ensuite sur le canevas) quelle que soit la source du glisser-déposer.
 */
const LadderSystemBlockTool = ({
	blockType,
	width = 45,
	disabled,
	label,
	children,
}: {
	blockType: SystemBlockType;
	width?: number;
	disabled?: boolean;
	label?: string;
	children: React.ReactElement;
}) => {
	const canEdit = useCanEditActivePage();
	disabled = disabled || !canEdit;

	return (
		<DraggableToolCell
			width={width}
			disabled={disabled}
			label={label}
			onDragStart={(e) => {
				e.dataTransfer.setData(LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE, blockType);
				e.dataTransfer.effectAllowed = "copy";
			}}
		>
			{children}
		</DraggableToolCell>
	);
};

export default LadderSystemBlockTool;
