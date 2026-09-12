"use client";

import { RectangleData } from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import useHmiStyleAnimation from "./useHmiStyleAnimation";

const Rectangle = ({
	data,
	selected,
	onClick,
	animationsEnabled,
}: HmiWidgetComponentProps<RectangleData>) => {
	const animated = useHmiStyleAnimation(
		data.animations?.style,
		animationsEnabled ?? false,
	);
	const fill = animated.fill ?? data.style.fill;
	const stroke = animated.stroke ?? data.style.stroke;

	return (
		<Box
			onClick={onClick}
			sx={{
				width: "100%",
				height: "100%",
				boxSizing: "border-box",
				backgroundColor: fill,
				border: `${data.style.strokeWidth ?? 0}px solid ${stroke}`,
				borderRadius: data.style.borderRadius ?? 0,
				outline: selected ? "2px dashed #1976d2" : "none",
				outlineOffset: 2,
				cursor: onClick ? "pointer" : "default",
			}}
		/>
	);
};

export default Rectangle;
