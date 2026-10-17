"use client";

import {
	DEFAULT_PUSH_BUTTON_BEHAVIOR,
	PushButtonData,
} from "@/schemas/hmi/hmi-widget.schema";
import { Box, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import widgetBorder from "./widget-border";

/**
 * Mode simulation : comportement au clic piloté par `data.behavior` —
 * `momentary-no`/`momentary-nc` simulent le maintien d'un poussoir physique à contact NO/NF
 * (valeur de travail au mousedown, valeur de repos au mouseup/mouseleave : `false` pour NO,
 * `true` pour NF) ; `set`/`reset` forcent la valeur à 1/0 dès le mousedown et l'y laissent ;
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
	const behavior = data.behavior ?? DEFAULT_PUSH_BUTTON_BEHAVIOR;
	const normallyClosed = behavior === "momentary-nc";
	const momentary = behavior === "momentary-no" || normallyClosed;
	// For a normally closed button, the "pressed" look matches the working value `false`. An
	// unknown value (outside simulation) shows the rest appearance.
	const active =
		value !== undefined && (normallyClosed ? !value : Boolean(value));

	const handlePress = () => {
		if (behavior === "set") onValueChange?.(true);
		else if (behavior === "reset") onValueChange?.(false);
		else if (behavior === "toggle") onValueChange?.(!value);
		else onValueChange?.(!normallyClosed);
		onTrigger?.("onPress");
	};

	const handleRelease = () => {
		if (momentary) onValueChange?.(normallyClosed);
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
				border: widgetBorder(selected),
				backgroundColor: active ? "#1976d2" : "#e0e0e0",
				boxShadow: active
					? "inset 0 3px 6px rgba(0,0,0,0.3)"
					: "0 3px 6px rgba(0,0,0,0.2)",
				transition: "background-color 0.05s",
				cursor: onValueChange ? "pointer" : "default",
				userSelect: "none",
			}}
			onClick={onClick}
			onMouseDown={handlePress}
			onMouseUp={handleRelease}
			onMouseLeave={handleRelease}
		>
			{!hideLabel && data.label && (
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
					{data.label}
				</Typography>
			)}
		</Box>
	);
};

export default PushButton;
