"use client";

import { EllipseData } from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import useHmiStyleAnimation from "./useHmiStyleAnimation";

const Ellipse = ({
	data,
	selected,
	onClick,
	animationsEnabled,
}: HmiWidgetComponentProps<EllipseData>) => {
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
				borderRadius: "50%",
				backgroundColor: fill,
				border: `${data.style.strokeWidth ?? 0}px solid ${stroke}`,
				outline: selected ? "2px dashed #1976d2" : "none",
				outlineOffset: 2,
				cursor: onClick ? "pointer" : "default",
			}}
		/>
	);
};

export default Ellipse;
