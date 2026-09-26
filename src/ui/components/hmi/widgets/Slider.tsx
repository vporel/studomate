"use client";

import { clamp } from "@/lib/number";
import { SliderData } from "@/schemas/hmi/hmi-widget.schema";
import { Box, Slider as MuiSlider, Typography } from "@mui/material";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import widgetBorder from "./widget-border";
import HmiWidgetFrame from "./HmiWidgetFrame";

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
		typeof value === "number" ? value : clamp(0, min, max);
	const displayedValue = Number(numValue.toFixed(stepDecimals(step)));

	return (
		<HmiWidgetFrame label={data.label} hideLabel={hideLabel} onClick={onClick}>
			<Box
				sx={{
					width: "100%",
					height: "100%",
					display: "flex",
					flexDirection: vertical ? "column-reverse" : "row",
					alignItems: "center",
					gap: 1,
					border: widgetBorder(selected),
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
		</HmiWidgetFrame>
	);
};

export default Slider;
