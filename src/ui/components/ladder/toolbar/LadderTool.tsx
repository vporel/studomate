"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Box, Tooltip } from "@mui/material";
import React from "react";
import {
	DraggedLadderElement,
	useLadderToolbarDnD,
} from "./LadderToolbarDnDContext";

const LadderTool = ({
	element,
	disabled,
	label,
	children,
}: {
	element: DraggedLadderElement;
	disabled?: boolean;
	label?: string;
	children: React.ReactElement;
}) => {
	const { setDraggedElement } = useLadderToolbarDnD();
	const mode = useProjectStore((state) => state.mode);
	disabled = disabled || mode !== ProjectMode.DESIGN;

	const tool = (
		<Box
			sx={{
				width: 45,
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
				setDraggedElement(element);
				e.dataTransfer.effectAllowed = "copy";
			}}
			onDragEnd={() => setDraggedElement(null)}
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

export default LadderTool;
