"use client";

import {
	DEFAULT_INDICATOR_OFF_COLOR,
	DEFAULT_INDICATOR_ON_COLOR,
	IndicatorData,
} from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

const Indicator = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
}: HmiWidgetComponentProps<IndicatorData>) => {
	const active = Boolean(value);
	const onColor = data.onColor ?? DEFAULT_INDICATOR_ON_COLOR;
	const offColor = data.offColor ?? DEFAULT_INDICATOR_OFF_COLOR;

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
					backgroundColor: active ? onColor : offColor,
					boxShadow: active ? `0 0 10px 3px ${alpha(onColor, 0.6)}` : "none",
					transition: "background-color 0.1s, box-shadow 0.1s",
				}}
			/>
			{!hideLabel && data.label && (
				<Typography
					sx={{
						position: "absolute",
						top: "100%",
						left: "50%",
						transform: "translateX(-50%)",
						width: "max-content",
						maxWidth: "none",
						mt: 0.5,
						fontSize: "0.7rem",
						color: "#333",
						textAlign: "center",
						whiteSpace: "nowrap",
					}}
				>
					{data.label}
				</Typography>
			)}
		</Box>
	);
};

export default Indicator;
