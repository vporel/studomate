"use client";

import { Box, Tooltip } from "@mui/material";
import { DragEvent, ReactElement } from "react";

type DraggableToolCellProps = {
	width?: number;
	disabled?: boolean;
	label?: string;
	onDragStart: (e: DragEvent<HTMLDivElement>) => void;
	onDragEnd?: () => void;
	children: ReactElement;
};

const DraggableToolCell = ({
	width = 45,
	disabled,
	label,
	onDragStart,
	onDragEnd,
	children,
}: DraggableToolCellProps) => {
	const cell = (
		<Box
			sx={{
				width,
				height: 24,
				cursor: disabled ? "not-allowed" : "grab",
				userSelect: "none",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: "3px 6px",
				opacity: disabled ? 0.4 : 1,
				"&:hover": {
					background: "rgb(240, 240, 240)",
				},
			}}
			draggable={!disabled}
			onDragStart={onDragStart}
			onDragEnd={onDragEnd}
		>
			{children}
		</Box>
	);

	if (!label) return cell;

	return (
		<Tooltip title={label} placement="bottom" arrow>
			{cell}
		</Tooltip>
	);
};

export default DraggableToolCell;
