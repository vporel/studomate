"use client";

import { ToggleSwitchData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

const ToggleSwitch = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
	onValueChange,
}: HmiWidgetComponentProps<ToggleSwitchData>) => {
	const active = Boolean(value);

	return (
		// `size` ne dimensionne que la piste (le dessin) : le libellé est positionné en absolu
		// sous le widget pour ne jamais l'empiéter, quelle que soit sa taille.
		<Box
			sx={{
				position: "relative",
				width: "100%",
				height: "100%",
				cursor: onValueChange || onClick ? "pointer" : "default",
				userSelect: "none",
			}}
			onClick={() => (onValueChange ? onValueChange(!active) : onClick?.())}
		>
			{/* Piste — le curseur suit `justifyContent` plutôt qu'un `left` en px, pour rester
			cohérent quelle que soit la taille du widget (redimensionnable). */}
			<Box
				sx={{
					width: "100%",
					height: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: active ? "flex-end" : "flex-start",
					padding: "2px",
					borderRadius: 999,
					border: selected ? "2px solid #1976d2" : "2px solid #555",
					backgroundColor: active ? "#1976d2" : "#bdbdbd",
					transition: "background-color 0.15s",
				}}
			>
				<Box
					sx={{
						height: "100%",
						aspectRatio: "1",
						borderRadius: "50%",
						backgroundColor: "white",
						boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
					}}
				/>
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
					{data.label || "Interrupteur"}
				</Typography>
			)}
		</Box>
	);
};

export default ToggleSwitch;
