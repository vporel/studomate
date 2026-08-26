"use client";

import { PushButtonData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

/**
 * Mode simulation : comportement au clic piloté par `data.behavior` (défaut : `momentary`) —
 * `momentary` simule le maintien d'un poussoir physique (`true` au mousedown, `false` au
 * mouseup/mouseleave) ; `set`/`reset` forcent la valeur à 1/0 dès le mousedown et l'y laissent ;
 * `toggle` l'inverse à chaque mousedown.
 */
const PushButton = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
	onValueChange,
	onTrigger,
}: HmiWidgetComponentProps<PushButtonData>) => {
	const active = Boolean(value);
	const behavior = data.behavior ?? "momentary";

	const handlePress = () => {
		if (behavior === "set") onValueChange?.(true);
		else if (behavior === "reset") onValueChange?.(false);
		else if (behavior === "toggle") onValueChange?.(!active);
		else onValueChange?.(true);
		onTrigger?.("onPress");
	};

	const handleRelease = () => {
		if (behavior === "momentary") onValueChange?.(false);
	};

	return (
		<Box
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				borderRadius: "6px",
				border: selected ? "2px solid #1976d2" : "2px solid #555",
				backgroundColor: active ? "#1976d2" : "#e0e0e0",
				boxShadow: active ? "inset 0 3px 6px rgba(0,0,0,0.3)" : "0 3px 6px rgba(0,0,0,0.2)",
				transition: "background-color 0.05s",
				cursor: onValueChange ? "pointer" : "default",
				userSelect: "none",
			}}
			onClick={onClick}
			onMouseDown={handlePress}
			onMouseUp={handleRelease}
			onMouseLeave={handleRelease}
		>
			{!hideLabel && (
				<Typography
					sx={{
						fontSize: "0.8rem",
						fontWeight: 600,
						color: active ? "#fff" : "#333",
						textAlign: "center",
						px: 0.5,
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
						maxWidth: "100%",
					}}
				>
					{data.label || "BP"}
				</Typography>
			)}
		</Box>
	);
};

export default PushButton;
