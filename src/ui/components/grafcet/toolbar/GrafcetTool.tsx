"use client";

import {
	type GrafcetElementsTranslator,
	grafcetElementTypeLabel,
} from "@/ui/components/grafcet/flow/describe-grafcet-element";
import useCanEdit from "@/ui/components/projects/useCanEdit";
import { useT } from "@/ui/i18n/useT";
import { Box } from "@mui/material";
import React from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import setGrafcetDragPreview from "./grafcet-drag-preview";
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
	const { setDraggedItem } = useGrafcetToolbarDnD();
	const canEdit = useCanEdit();
	const zoom = useGrafcetStore((state) => state.zoom) ?? 1;
	const t = useT(
		"grafcetEditor.elements",
	) as unknown as GrafcetElementsTranslator;
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
				setDraggedItem(element);
				e.dataTransfer.effectAllowed = "move";
				setGrafcetDragPreview(
					e.dataTransfer,
					element,
					zoom,
					grafcetElementTypeLabel("comment", t),
				);
			}}
		>
			{children}
		</Box>
	);
};

export default GrafcetTool;
