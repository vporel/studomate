import { BoxProps } from "@mui/material";
import { ElementType, ReactNode } from "react";

export type CustomBoxProps<C extends ElementType = "div"> = BoxProps<C> & {
	children?: ReactNode;
	component?: C;
};
