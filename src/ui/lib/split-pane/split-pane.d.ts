import { BoxProps } from "@mui/material";
import { ReactElement } from "react";

type SizeValue = string | number;

export interface PaneProps extends BoxProps {
	children: ReactNode;
	initialSize?: SizeValue; //%, px, number (in pixels)
	minSize?: SizeValue;
	maxSize?: SizeValue;
	visible?: boolean; //default: true
}

export interface SplitPaneProps extends BoxProps {
	children: ReactElement<PaneProps>[];
	split?: "vertical" | "horizontal";
	width?: SizeValue; //forced at 100% when vertical
	height?: SizeValue; //forced at 100% when horizontal
}
