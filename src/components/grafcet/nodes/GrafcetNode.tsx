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
	{ id, type, className = "", children, sx, ...props },
	ref,
) {
	return (
		<Box
			id={id}
			ref={ref}
			className={`grafcet-node ${type + "-node"} ${className}`}
			sx={{
				...sx,
			}}
			{...props}
		>
			{children}
		</Box>
	);
});

export default GrafcetNode;
