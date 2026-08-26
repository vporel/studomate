"use client";

import { TextData } from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import useHmiStyleAnimation from "./useHmiStyleAnimation";

const ALIGN_TO_JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;

const Text = ({ data, selected, onClick }: HmiWidgetComponentProps<TextData>) => {
	const animated = useHmiStyleAnimation(data.animations?.style);
	const text = animated.text ?? data.text;
	const align = data.style?.align ?? "center";

	return (
		<Box
			onClick={onClick}
			sx={{
				width: "100%",
				height: "100%",
				boxSizing: "border-box",
				display: "flex",
				alignItems: "center",
				justifyContent: ALIGN_TO_JUSTIFY[align],
				overflow: "hidden",
				outline: selected ? "2px dashed #1976d2" : "none",
				outlineOffset: 2,
				cursor: onClick ? "pointer" : "default",
				fontSize: data.style?.fontSize ?? 14,
				color: data.style?.color ?? "#333333",
				textAlign: align,
				whiteSpace: "nowrap",
				textOverflow: "ellipsis",
			}}
		>
			{text}
		</Box>
	);
};

export default Text;
