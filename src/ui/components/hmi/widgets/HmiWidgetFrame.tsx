"use client";

import { Box } from "@mui/material";
import { ReactNode } from "react";
import HmiWidgetLabel from "./HmiWidgetLabel";

type HmiWidgetFrameProps = {
	label?: string;
	hideLabel?: boolean;
	onClick?: () => void;
	cursor?: "pointer" | "default";
	children: ReactNode;
};

/** Le libellé est positionné en absolu sous le cadre : il n'empiète jamais sur le dessin. */
const HmiWidgetFrame = ({
	label,
	hideLabel,
	onClick,
	cursor,
	children,
}: HmiWidgetFrameProps) => (
	<Box
		sx={{
			position: "relative",
			width: "100%",
			height: "100%",
			cursor: cursor ?? (onClick ? "pointer" : "default"),
			userSelect: "none",
		}}
		onClick={onClick}
	>
		{children}
		<HmiWidgetLabel label={label} hidden={hideLabel} />
	</Box>
);

export default HmiWidgetFrame;
