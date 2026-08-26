"use client";

import { IndicatorData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

const Indicator = ({ data, value, selected, hideLabel, onClick }: HmiWidgetComponentProps<IndicatorData>) => {
	const active = Boolean(value);

	return (
		// `size` ne dimensionne que le voyant (le dessin) : le libellé est positionné en absolu
		// sous le widget pour ne jamais l'empiéter, quelle que soit sa taille.
		<Box
			sx={{
				position: "relative",
				width: "100%",
				height: "100%",
				cursor: onClick ? "pointer" : "default",
				userSelect: "none",
			}}
			onClick={onClick}
		>
			<Box
				sx={{
					width: "100%",
					height: "100%",
					borderRadius: "50%",
					border: selected ? "2px solid #1976d2" : "2px solid #555",
					backgroundColor: active ? "#4caf50" : "#bdbdbd",
					boxShadow: active ? "0 0 10px 3px rgba(76,175,80,0.6)" : "none",
					transition: "background-color 0.1s, box-shadow 0.1s",
				}}
			/>
			{!hideLabel && (
				<Typography
					sx={{
						position: "absolute",
						top: "100%",
						left: 0,
						width: "100%",
						mt: 0.5,
						fontSize: "0.7rem",
						color: "#333",
						textAlign: "center",
						whiteSpace: "nowrap",
						overflow: "hidden",
						textOverflow: "ellipsis",
					}}
				>
					{data.label || "Voyant"}
				</Typography>
			)}
		</Box>
	);
};

export default Indicator;
