"use client";

import {
	DEFAULT_INDICATOR_OFF_COLOR,
	DEFAULT_INDICATOR_ON_COLOR,
	IndicatorData,
} from "@/schemas/hmi/hmi-widget.schema";
import { Box } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { HmiWidgetComponentProps } from "./hmi-widget-component";
import widgetBorder from "./widget-border";
import HmiWidgetFrame from "./HmiWidgetFrame";

const Indicator = ({
	data,
	value,
	selected,
	hideLabel,
	onClick,
}: HmiWidgetComponentProps<IndicatorData>) => {
	const active = Boolean(value);
	const onColor = data.onColor ?? DEFAULT_INDICATOR_ON_COLOR;
	const offColor = data.offColor ?? DEFAULT_INDICATOR_OFF_COLOR;

	return (
		// `size` ne dimensionne que le voyant (le dessin) : le libellé est positionné en absolu
		// sous le widget pour ne jamais l'empiéter, quelle que soit sa taille.
		<HmiWidgetFrame label={data.label} hideLabel={hideLabel} onClick={onClick}>
			<Box
				sx={{
					width: "100%",
					height: "100%",
					borderRadius: "50%",
					border: widgetBorder(selected),
					backgroundColor: active ? onColor : offColor,
					boxShadow: active ? `0 0 10px 3px ${alpha(onColor, 0.6)}` : "none",
					transition: "background-color 0.1s, box-shadow 0.1s",
				}}
			/>
		</HmiWidgetFrame>
	);
};

export default Indicator;
