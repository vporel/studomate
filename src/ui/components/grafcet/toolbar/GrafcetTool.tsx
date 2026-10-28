"use client";

import useCanEdit from "@/ui/components/projects/useCanEdit";
import { Box } from "@mui/material";
import React from "react";
import {
	DraggedGrafcetElement,
	useGrafcetToolbarDnD,
} from "./GrafcetToolbarDnDContext";

const GrafcetTool = ({
	element,
	disabled,
	children,
}: {
	element: DraggedGrafcetElement;
	disabled?: boolean;
	children: React.ReactElement;
}) => {
	const { setDraggedElement } = useGrafcetToolbarDnD();
	const canEdit = useCanEdit();
	disabled = disabled || !canEdit;

	return (
		<Box
			className={`grafcet-toolbar__tool grafcet-toolbar__${element.type} ${
				disabled ? " grafcet-toolbar__tool--disabled" : ""
			}`}
			sx={{
				width: "fit-content",
				cursor: disabled ? "not-allowed" : "grab",
				userSelect: "none",
				textAlign: "center",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				opacity: disabled ? 0.4 : 1,
				"&:hover": {
					background: "rgb(240, 240, 240)",
				},
			}}
			draggable={!disabled}
			onDragStart={(e) => {
				setDraggedElement(element);
				e.dataTransfer.effectAllowed = "move";
			}}
		>
			{children}
		</Box>
	);
};

export default GrafcetTool;
