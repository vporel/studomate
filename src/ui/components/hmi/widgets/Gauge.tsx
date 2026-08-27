"use client";

import { GaugeData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography, useTheme } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

const Gauge = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
}: HmiWidgetComponentProps<GaugeData>) => {
	const th = useTheme();
	const numValue = typeof value === "number" ? value : 0;
	const min = data.min ?? 0;
	const max = data.max ?? 100;
	const range = max - min || 1;
	const pct = Math.min(1, Math.max(0, (numValue - min) / range));
	// Barre de 0 à 100%, horizontale ou verticale selon l'orientation
	const fillColor = th.palette.primary.main;
	const vertical = (data.style?.orientation ?? "horizontal") === "vertical";

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
					flexDirection: vertical ? "column" : "row",
					justifyContent: "space-between",
					alignItems: "center",
					gap: 0.5,
					border: selected ? "2px solid #1976d2" : "2px solid #555",
					borderRadius: 1,
					backgroundColor: "#f5f5f5",
					px: vertical ? 0.5 : 1,
					py: vertical ? 1 : 0.5,
				}}
			>
				{/* Valeur numérique */}
				<Typography
					sx={{
						fontSize: "0.85rem",
						fontWeight: 700,
						textAlign: "right",
						color: "#333",
						position: "absolute",
						top: "50%",
						left: "50%",
						transform: "translate(-50%, -50%)",
					}}
				>
					{numValue}
				</Typography>
				{/* En vertical, le max est en haut et le min en bas (thermomètre) */}
				<Typography sx={{ fontSize: "0.6rem", color: "#888" }}>
					{vertical ? max : min}
				</Typography>
				{/* Barre de progression */}
				<Box
					sx={
						vertical
							? {
									flex: 1,
									width: 15,
									backgroundColor: "#ddd",
									borderRadius: 6,
									overflow: "hidden",
									display: "flex",
									flexDirection: "column-reverse",
								}
							: {
									flex: 1,
									height: 15,
									backgroundColor: "#ddd",
									borderRadius: 6,
									overflow: "hidden",
								}
					}
				>
					<Box
						sx={
							vertical
								? {
										height: `${pct * 100}%`,
										width: "100%",
										backgroundColor: fillColor,
										borderRadius: 6,
										transition: "height 0.1s, background-color 0.1s",
									}
								: {
										width: `${pct * 100}%`,
										height: "100%",
										backgroundColor: fillColor,
										borderRadius: 6,
										transition: "width 0.1s, background-color 0.1s",
									}
						}
					/>
				</Box>
				<Typography sx={{ fontSize: "0.6rem", color: "#888" }}>
					{vertical ? min : max}
				</Typography>
			</Box>
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

export default Gauge;
