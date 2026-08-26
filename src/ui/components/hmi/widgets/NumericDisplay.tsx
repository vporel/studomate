"use client";

import { NumericDisplayData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

const NumericDisplay = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
}: HmiWidgetComponentProps<NumericDisplayData>) => {
	const numValue = typeof value === "number" ? value : 0;
	const unit = data.unit ?? "";
	const decimalPlaces = data.decimalPlaces ?? 0;
	const formatted = numValue.toFixed(Math.max(0, decimalPlaces));

	return (
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
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 0.5,
					border: selected ? "2px solid #1976d2" : "2px solid #555",
					borderRadius: 1,
					backgroundColor: "#1a1a1a",
					fontFamily: "'Courier New', monospace",
					color: "#00e676",
					px: 1,
				}}
			>
				<Typography
					sx={{
						fontSize: "1.2rem",
						fontWeight: 700,
						color: "white",
					}}
				>
					{formatted}
				</Typography>
				{unit && (
					<Typography
						sx={{
							fontSize: "0.75rem",
							color: "white",
						}}
					>
						{unit}
					</Typography>
				)}
			</Box>
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
					{data.label || "Affichage"}
				</Typography>
			)}
		</Box>
	);
};

export default NumericDisplay;
