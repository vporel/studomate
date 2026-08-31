"use client";

import { LineData } from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import useHmiStyleAnimation from "./useHmiStyleAnimation";

const Line = ({
	data,
	selected,
	onClick,
	animationsEnabled,
}: HmiWidgetComponentProps<LineData>) => {
	const animated = useHmiStyleAnimation(
		data.animations?.style,
		animationsEnabled ?? false,
	);
	const color = animated.color ?? data.style.color;
	const thickness = data.style.thickness ?? 2;
	const vertical = (data.style.orientation ?? "horizontal") === "vertical";

	return (
		<Box
			onClick={onClick}
			sx={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				outline: selected ? "2px dashed #1976d2" : "none",
				outlineOffset: 2,
				cursor: onClick ? "pointer" : "default",
			}}
		>
			<Box
				sx={{
					backgroundColor: color,
					width: vertical ? thickness : "100%",
					height: vertical ? "100%" : thickness,
				}}
			/>
		</Box>
	);
};

export default Line;
