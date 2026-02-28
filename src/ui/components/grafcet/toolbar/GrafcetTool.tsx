"use client";

import { ElementType } from "@/schemas/grafcet/element.schema";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Box } from "@mui/material";
import React from "react";
import { useProjectStore } from "../../projects/ProjectContext";
import { useGrafcetToolbarDnD } from "./GrafcetToolbarDnDContext";

const GrafcetTool = ({
	type,
	extraData,
	disabled,
	children,
}: {
	type: ElementType;
	extraData?: any;
	disabled?: boolean;
	children: React.ReactElement;
}) => {
	const { setType, setExtraData } = useGrafcetToolbarDnD();
	const mode = useProjectStore((state) => state.mode);
	disabled = disabled || mode !== ProjectMode.DESIGN;

	return (
		<Box
			className={`grafcet-toolbar__tool grafcet-toolbar__${type} ${
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
				setType(type);
				setExtraData(extraData || null);
				e.dataTransfer.effectAllowed = "move";
			}}
		>
			{children}
		</Box>
	);
};

export default GrafcetTool;
