"use client";

import { ElementType } from "@/schemas/grafcet/element.schema";
import ErrorTooltip from "@/ui/lib/mui/tooltip/ErrorTooltip";
import { Box, BoxProps } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { forwardRef, ReactNode } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";

interface GrafcetNodeProps extends BoxProps {
	id: string;
	type: ElementType;
	error?: string | false;
	children: ReactNode;
	className?: string;
}

const GrafcetNode = forwardRef<HTMLElement, GrafcetNodeProps>(
	function GrafcetNode(
		{ id, type, error, className = "", children, sx, ...props },
		ref,
	) {
		const theme = useTheme();
		const highlighted = useGrafcetStore((state) =>
			state.highlightedNodesIds.includes(id),
		);

		let highlightSx: object | undefined;
		if (highlighted) {
			const mainColor = theme.palette.primary.main;
			const faded = alpha(mainColor, 0.25);
			highlightSx = {
				"&::before": {
					content: '""',
					position: "absolute",
					top: "-7px",
					left: "-7px",
					right: "-7px",
					bottom: "-7px",
					border: "4px solid",
					borderColor: mainColor,
					borderRadius: "4px",
					animation: "grafcet-node-blink 1s infinite linear",
				},
				"@keyframes grafcet-node-blink": {
					"0%": { borderColor: mainColor },
					"50%": { borderColor: faded },
					"100%": { borderColor: mainColor },
				},
			};
		}

		return (
			<ErrorTooltip open={!!error} title={error}>
				<Box
					id={`grafcet-node-${id}`}
					ref={ref}
					className={`grafcet-node grafcet-${type}-node ${highlighted ? "highlighted" : ""} ${className}`}
					sx={highlightSx ? { ...sx, ...highlightSx } : sx}
					{...props}
				>
					{children}
				</Box>
			</ErrorTooltip>
		);
	},
);

export default GrafcetNode;
