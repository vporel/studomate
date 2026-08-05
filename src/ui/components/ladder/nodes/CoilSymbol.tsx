"use client";

import { CoilMode } from "@/schemas/ladder/element.schema";
import { Box } from "@mui/material";

const COIL_MODE_LABELS: Record<CoilMode, string> = {
	normal: "",
	set: "S",
	reset: "R",
};

/**
 * Symbole visuel d'une bobine, sans les Handles React Flow ni le label — réutilisé par
 * `CoilNode` (canevas) et `CoilTool` (icône de la toolbar).
 */
const CoilSymbol = ({ mode, color = "black" }: { mode: CoilMode; color?: string }) => {
	return (
		<Box
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				fontSize: "0.9rem",
				fontWeight: "bold",
				position: "relative",
				color,
			}}
		>
			{COIL_MODE_LABELS[mode]}
			<Box
				sx={{
					position: "absolute",
					left: "0%",
					top: "calc(50% - 1px)",
					width: "20%",
					height: "2px",
					background: color,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					left: "20%",
					right: "20%",
					top: 0,
					height: "100%",
					borderLeft: `2px solid ${color}`,
					borderRight: `2px solid ${color}`,
					borderRadius: "6px",
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					right: "0",
					top: "calc(50% - 1px)",
					width: "20%",
					height: "2px",
					background: color,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					right: "0",
					top: "calc(50% - 4px)",
					width: "2px",
					height: "8px",
					background: color,
				}}
			/>
		</Box>
	);
};

export default CoilSymbol;
