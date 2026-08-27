"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import { Box, Tooltip } from "@mui/material";
import React from "react";

/**
 * Outil de dépose pour un bloc système (compare, assign, arithmetic) — même geste que `LadderTool`
 * (glisser-déposer une icône vers le canevas), mais porte le glissement en `DataTransfer` natif
 * plutôt que par le contexte React `LadderToolbarDnDContext` : c'est le même mécanisme que la
 * section "Blocs systèmes" de l'explorateur (voir `ExplorerSystemBlocksItems`), pour que
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
	blockType: "compare" | "assign" | "arithmetic";
	width?: number;
	disabled?: boolean;
	label?: string;
	children: React.ReactElement;
}) => {
	const mode = useProjectStore((state) => state.mode);
	disabled = disabled || mode !== ProjectMode.DESIGN;

	const tool = (
		<Box
			sx={{
				width,
				height: 24,
				cursor: disabled ? "not-allowed" : "grab",
				userSelect: "none",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "3px 6px",
				opacity: disabled ? 0.4 : 1,
				"&:hover": {
					background: "rgb(240, 240, 240)",
				},
			}}
			draggable={!disabled}
			onDragStart={(e) => {
				e.dataTransfer.setData(LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE, blockType);
				e.dataTransfer.effectAllowed = "copy";
			}}
		>
			{children}
		</Box>
	);

	if (!label) return tool;

	return (
		<Tooltip title={label} placement="bottom" arrow>
			{tool}
		</Tooltip>
	);
};

export default LadderSystemBlockTool;
