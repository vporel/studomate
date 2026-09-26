"use client";

import { SliderData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Slider as MuiSlider, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";

/** Number of decimals of `step`, so that the displayed value does not show float noise. */
export function stepDecimals(step: number): number {
	const [, decimals = ""] = String(step).split(".");
	return decimals.length;
}

const Slider = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
	onValueChange,
}: HmiWidgetComponentProps<SliderData>) => {
	const min = data.min ?? 0;
	const max = data.max ?? 100;
	const step = data.step !== undefined && data.step > 0 ? data.step : 1;
	const vertical = (data.style?.orientation ?? "horizontal") === "vertical";
	const numValue =
		typeof value === "number" ? value : Math.min(max, Math.max(min, 0));
	const displayedValue = Number(numValue.toFixed(stepDecimals(step)));

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
					flexDirection: vertical ? "column-reverse" : "row",
					alignItems: "center",
					gap: 1,
					border: selected ? "2px solid #1976d2" : "2px solid #555",
					borderRadius: 1,
					backgroundColor: "#f5f5f5",
					px: vertical ? 0.5 : 1.5,
					py: vertical ? 1.5 : 0.5,
				}}
			>
				<Box
					sx={{
						flex: 1,
						minWidth: 0,
						minHeight: 0,
						width: vertical ? "auto" : "100%",
						height: vertical ? "100%" : "auto",
						display: "flex",
						justifyContent: "center",
						alignItems: "center",
						// Design mode: the click must reach the container to select the widget.
						pointerEvents: onValueChange ? "auto" : "none",
					}}
				>
					<MuiSlider
						size="small"
						orientation={vertical ? "vertical" : "horizontal"}
						min={min}
						max={max}
						step={step}
						value={numValue}
						onChange={(_, next) => onValueChange?.(next as number)}
						slotProps={{ input: { "aria-label": data.label || data.variable } }}
						sx={vertical ? { height: "100%" } : undefined}
					/>
				</Box>
				<Typography
					sx={{
						fontSize: "0.85rem",
						fontWeight: 700,
						color: "#333",
						minWidth: "3ch",
						textAlign: "center",
					}}
				>
					{displayedValue}
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

export default Slider;
