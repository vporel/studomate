"use client";

import { ElementType } from "@/schemas/grafcet/element.schema";
import ErrorTooltip from "@/ui/lib/mui/tooltip/ErrorTooltip";
import { Box, BoxProps } from "@mui/material";
import { forwardRef, ReactNode } from "react";

interface GrafcetNodeProps extends BoxProps {
	id: string;
	type: ElementType;
	error?: string | false;
	children: ReactNode;
	className?: string;
}

const GrafcetNode = forwardRef<HTMLElement, GrafcetNodeProps>(function GrafcetNode(
	{ id, type, error, className = "", children, sx, ...props },
	ref,
) {
	return (
		<ErrorTooltip open={!!error} title={error}>
			<Box
				id={`grafcet-node-${id}`}
				ref={ref}
				className={`grafcet-node ${type + "-node"} ${className}`}
				sx={{
					...sx,
				}}
				{...props}
			>
				{children}
			</Box>
		</ErrorTooltip>
	);
});

export default GrafcetNode;
