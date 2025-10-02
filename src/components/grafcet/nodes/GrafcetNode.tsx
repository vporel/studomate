"use client";

import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { Box, BoxProps } from "@mui/material";
import { forwardRef, ReactNode } from "react";

interface GrafcetNodeProps extends BoxProps {
	id: string;
	type: GrafcetElementType;
	children: ReactNode;
	className?: string;
}

const GrafcetNode = forwardRef<HTMLElement, GrafcetNodeProps>(function GrafcetNode(
	{ id, type, className = "", children, ...rest },
	ref
) {
	return (
		<Box id={id} ref={ref} className={`grafcet-node ${type + "-node"} ${className}`} {...rest}>
			{children}
		</Box>
	);
});

GrafcetNode.displayName = "GrafcetNode";

export default GrafcetNode;
