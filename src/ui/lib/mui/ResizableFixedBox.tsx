"use client";

import { Box } from "@mui/material";
import { useRef, useState } from "react";

type Props = {
	position: "top" | "bottom" | "left" | "right";
	offset?: number; // in pixels, distance from the edge of the screen
	initialSize?: number;
	minSize?: number;
	children?: React.ReactNode;
	contentContainerProps?: {
		sx?: any;
	};
};

function Handle({
	boxPosition,
	onMouseDown,
}: {
	boxPosition: Props["position"];
	onMouseDown: (e: React.MouseEvent) => void;
}) {
	const vertical = boxPosition === "top" || boxPosition === "bottom";

	return (
		<Box
			sx={{
				width: vertical ? "100%" : 3,
				height: vertical ? 3 : "100%",
				cursor: vertical ? "row-resize" : "col-resize",
				top: boxPosition === "bottom" ? 0 : boxPosition === "top" ? "auto" : 0,
				bottom: boxPosition === "top" ? 0 : boxPosition === "bottom" ? "auto" : 0,
				left: boxPosition === "right" ? 0 : boxPosition === "left" ? "auto" : 0,
				right: boxPosition === "left" ? 0 : boxPosition === "right" ? "auto" : 0,
				marginTop: boxPosition === "top" ? "-3px" : 0,
				marginBottom: boxPosition === "bottom" ? "-3px" : 0,
				marginLeft: boxPosition === "left" ? "-3px" : 0,
				marginRight: boxPosition === "right" ? "-3px" : 0,
				borderBottom: boxPosition === "top" ? "1px solid rgba(0,0,0,0.2)" : "none",
				borderTop: boxPosition === "bottom" ? "1px solid rgba(0,0,0,0.2)" : "none",
				borderRight: boxPosition === "left" ? "1px solid rgba(0,0,0,0.2)" : "none",
				borderLeft: boxPosition === "right" ? "1px solid rgba(0,0,0,0.2)" : "none",
				position: "absolute",
				zIndex: 100,
			}}
			onMouseDown={onMouseDown}
		/>
	);
}

export default function ResizableFixedBox({
	position,
	offset = 0,
	initialSize = 350,
	minSize = 250,
	children,
	contentContainerProps = {},
}: Props) {
	const vertical = position === "top" || position === "bottom";
	const [size, setSize] = useState(initialSize);
	const startRef = useRef<{ x: number; w: number; y: number; h: number } | null>(null);
	const onMouseDown = (e: React.MouseEvent) => {
		startRef.current = { x: e.clientX, w: size, y: e.clientY, h: size };
		const onMove = (ev: MouseEvent) =>
			setSize(
				vertical
					? Math.max(
							minSize,
							startRef.current!.h -
								(ev.clientY - startRef.current!.y) * (position === "top" ? -1 : 1),
						)
					: Math.max(
							minSize,
							startRef.current!.w -
								(ev.clientX - startRef.current!.x) * (position === "left" ? -1 : 1),
						),
			);
		const onUp = () => {
			window.removeEventListener("mousemove", onMove);
			window.removeEventListener("mouseup", onUp);
			startRef.current = null;
		};
		window.addEventListener("mousemove", onMove);
		window.addEventListener("mouseup", onUp);
	};

	return (
		<Box
			sx={{
				position: "fixed",
				zIndex: 1000,
				top: position === "top" ? offset : position === "bottom" ? "auto" : 0,
				bottom: position === "bottom" ? offset : position === "top" ? "auto" : 0,
				left: position === "left" ? offset : position === "right" ? "auto" : 0,
				right: position === "right" ? offset : position === "left" ? "auto" : 0,
				width: vertical ? "100%" : size,
				height: vertical ? size : "100%",
				boxShadow: `2px 2px 10px rgba(0,0,0,0.2)`,
			}}
		>
			<Handle boxPosition={position} onMouseDown={onMouseDown} />
			<Box
				sx={{
					width: "100%",
					height: "100%",
					overflow: "auto",
					backgroundColor: "white",
					...contentContainerProps.sx,
				}}
			>
				{children}
			</Box>
		</Box>
	);
}
