'use client'

import { Box } from "@mui/material"
import React from "react"
import { useGrafcetToolbarDnD } from "./GrafcetToolbarDnDContext"
import { NodeTypeKey } from "../grafcet-nodes-definitions"

const GrafcetTool = ({disabled, type, children}: {disabled?: boolean, type: NodeTypeKey, children: React.ReactElement}) => {
	const [_, setType] = useGrafcetToolbarDnD()

	return (
		<Box 
			className={`grafcet-toolbar__tool grafcet-toolbar__${type} ${(disabled ? " grafcet-toolbar__tool--disabled" : "")}`}
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
					background: "#e0e0e0"
				}
			}}
			draggable
			onDragStart={e => {
				setType(type)
				e.dataTransfer.effectAllowed = "move"
			}}
		>
			{children}
		</Box>
	)
}

export default GrafcetTool