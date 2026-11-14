"use client";

import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

export type FloatingBoxPosition = { x: number; y: number };
export type FloatingBoxSize = { width: number; height: number };

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const EDGE_MARGIN = 8;
const HANDLE_THICKNESS = 6;
const HANDLE_CORNER = 14;
const DEFAULT_MIN_WIDTH = 160;
const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_HEIGHT = 240;

const RESIZE_HANDLES: {
	direction: ResizeDirection;
	cursor: string;
	sx: Record<string, string | number>;
}[] = [
	{
		direction: "n",
		cursor: "ns-resize",
		sx: {
			top: -HANDLE_THICKNESS / 2,
			left: HANDLE_CORNER,
			right: HANDLE_CORNER,
			height: HANDLE_THICKNESS,
		},
	},
	{
		direction: "s",
		cursor: "ns-resize",
		sx: {
			bottom: -HANDLE_THICKNESS / 2,
			left: HANDLE_CORNER,
			right: HANDLE_CORNER,
			height: HANDLE_THICKNESS,
		},
	},
	{
		direction: "w",
		cursor: "ew-resize",
		sx: {
			left: -HANDLE_THICKNESS / 2,
			top: HANDLE_CORNER,
			bottom: HANDLE_CORNER,
			width: HANDLE_THICKNESS,
		},
	},
	{
		direction: "e",
		cursor: "ew-resize",
		sx: {
			right: -HANDLE_THICKNESS / 2,
			top: HANDLE_CORNER,
			bottom: HANDLE_CORNER,
			width: HANDLE_THICKNESS,
		},
	},
	{
		direction: "nw",
		cursor: "nwse-resize",
		sx: { top: -4, left: -4, width: HANDLE_CORNER, height: HANDLE_CORNER },
	},
	{
		direction: "ne",
		cursor: "nesw-resize",
		sx: { top: -4, right: -4, width: HANDLE_CORNER, height: HANDLE_CORNER },
	},
	{
		direction: "sw",
		cursor: "nesw-resize",
		sx: { bottom: -4, left: -4, width: HANDLE_CORNER, height: HANDLE_CORNER },
	},
	{
		direction: "se",
		cursor: "nwse-resize",
		sx: { bottom: -4, right: -4, width: HANDLE_CORNER, height: HANDLE_CORNER },
	},
];

type Frame = FloatingBoxPosition & FloatingBoxSize;

const between = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, value));

/**
 * The frame a drag from `direction` leads to: the edges being dragged follow the pointer, the
 * opposite ones stay put, and the frame stays within a parent of `parent` size.
 */
function resizeFrame(
	start: Frame,
	direction: ResizeDirection,
	dx: number,
	dy: number,
	parent: FloatingBoxSize,
	min: FloatingBoxSize,
): Frame {
	const frame = { ...start };
	if (direction.includes("e")) {
		frame.width = between(start.width + dx, min.width, parent.width - start.x);
	}
	if (direction.includes("w")) {
		const right = start.x + start.width;
		frame.width = between(start.width - dx, min.width, right);
		frame.x = right - frame.width;
	}
	if (direction.includes("s")) {
		frame.height = between(
			start.height + dy,
			min.height,
			parent.height - start.y,
		);
	}
	if (direction.includes("n")) {
		const bottom = start.y + start.height;
		frame.height = between(start.height - dy, min.height, bottom);
		frame.y = bottom - frame.height;
	}
	return frame;
}

/**
 * Non-modal box that stays inside its positioned parent and moves by its header.
 *
 * It opens at `position`, or at the top right of its parent (`top` px from its upper edge) when
 * there is none, and reports where it was left (on opening and after each move) so that the
 * owner can restore it.
 *
 * A `resizable` box can be resized from every edge and corner, like a window: its size starts at
 * `size`, or `width` by `height`, is bounded by `minWidth` / `minHeight` and its parent, and is
 * reported like its position. Its content then fills the area under the header.
 */
const FloatingBox = ({
	title,
	closeLabel,
	position,
	onPositionChange,
	onClose,
	width = 200,
	height = DEFAULT_HEIGHT,
	size = null,
	onSizeChange,
	resizable = false,
	minWidth = DEFAULT_MIN_WIDTH,
	minHeight = DEFAULT_MIN_HEIGHT,
	top = EDGE_MARGIN,
	actions,
	children,
}: {
	title: string;
	closeLabel: string;
	position: FloatingBoxPosition | null;
	onPositionChange: (position: FloatingBoxPosition) => void;
	onClose: () => void;
	width?: number;
	/** Initial height of a resizable box. */
	height?: number;
	size?: FloatingBoxSize | null;
	onSizeChange?: (size: FloatingBoxSize) => void;
	resizable?: boolean;
	minWidth?: number;
	minHeight?: number;
	top?: number;
	/** Buttons shown in the header, before the close button. */
	actions?: ReactNode;
	children: ReactNode;
}) => {
	const boxRef = useRef<HTMLDivElement>(null);
	const [current, setCurrent] = useState<FloatingBoxPosition>(
		position ?? { x: EDGE_MARGIN, y: top },
	);
	const [dimensions, setDimensions] = useState<FloatingBoxSize>(
		size ?? { width, height },
	);
	const currentRef = useRef(current);
	const dimensionsRef = useRef(dimensions);
	const opening = useRef({
		position,
		onPositionChange,
		onSizeChange,
		top,
		minWidth,
		minHeight,
	});
	const grab = useRef<{ x: number; y: number } | null>(null);
	const resizing = useRef<{
		direction: ResizeDirection;
		pointer: FloatingBoxPosition;
		frame: Frame;
	} | null>(null);
	const pendingFrame = useRef<number | null>(null);

	const place = useCallback((next: FloatingBoxPosition) => {
		currentRef.current = next;
		setCurrent(next);
	}, []);

	const resize = useCallback((next: FloatingBoxSize) => {
		dimensionsRef.current = next;
		setDimensions(next);
	}, []);

	//During a move or a resize, the frame is written on the element once per animation frame,
	//without rendering: it reaches the React state when the pointer is released.
	const writeFrameToElement = useCallback(() => {
		pendingFrame.current = null;
		const box = boxRef.current;
		if (!box) return;
		box.style.left = `${currentRef.current.x}px`;
		box.style.top = `${currentRef.current.y}px`;
		if (resizable) {
			box.style.width = `${dimensionsRef.current.width}px`;
			box.style.height = `${dimensionsRef.current.height}px`;
		}
	}, [resizable]);

	const scheduleFrameWrite = () => {
		pendingFrame.current ??= requestAnimationFrame(writeFrameToElement);
	};

	const commitGesture = () => {
		if (pendingFrame.current !== null) {
			cancelAnimationFrame(pendingFrame.current);
			writeFrameToElement();
		}
		place(currentRef.current);
		if (resizable) resize(dimensionsRef.current);
	};

	useEffect(
		() => () => {
			if (pendingFrame.current !== null)
				cancelAnimationFrame(pendingFrame.current);
		},
		[],
	);

	const clampToParent = (
		x: number,
		y: number,
		boxWidth = boxRef.current?.offsetWidth ?? 0,
		boxHeight = boxRef.current?.offsetHeight ?? 0,
	) => {
		const parent = boxRef.current?.offsetParent;
		if (!parent) return { x, y };
		const maxX = Math.max(0, parent.clientWidth - boxWidth);
		const maxY = Math.max(0, parent.clientHeight - boxHeight);
		return {
			x: Math.min(maxX, Math.max(0, x)),
			y: Math.min(maxY, Math.max(0, y)),
		};
	};

	useLayoutEffect(() => {
		const {
			position: remembered,
			onPositionChange: report,
			onSizeChange: reportSize,
			top: openingTop,
			minWidth: openingMinWidth,
			minHeight: openingMinHeight,
		} = opening.current;
		const box = boxRef.current;
		const parent = box?.offsetParent;
		if (!box || !parent) return;
		const fitted = resizable
			? {
					width: Math.max(
						openingMinWidth,
						Math.min(dimensionsRef.current.width, parent.clientWidth),
					),
					height: Math.max(
						openingMinHeight,
						Math.min(dimensionsRef.current.height, parent.clientHeight),
					),
				}
			: { width: box.offsetWidth, height: box.offsetHeight };
		if (resizable) {
			resize(fitted);
			reportSize?.(fitted);
		}
		const start = remembered ?? {
			x: parent.clientWidth - fitted.width - EDGE_MARGIN,
			y: openingTop,
		};
		const next = clampToParent(start.x, start.y, fitted.width, fitted.height);
		place(next);
		report(next);
	}, [place, resize, resizable]);

	const startMove = (event: PointerEvent<HTMLDivElement>) => {
		if ((event.target as HTMLElement).closest("button")) return;
		grab.current = {
			x: event.clientX - currentRef.current.x,
			y: event.clientY - currentRef.current.y,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const move = (event: PointerEvent<HTMLDivElement>) => {
		const start = grab.current;
		if (!start) return;
		currentRef.current = clampToParent(
			event.clientX - start.x,
			event.clientY - start.y,
		);
		scheduleFrameWrite();
	};

	const endMove = () => {
		if (!grab.current) return;
		grab.current = null;
		commitGesture();
		onPositionChange(currentRef.current);
	};

	const startResize =
		(direction: ResizeDirection) => (event: PointerEvent<HTMLDivElement>) => {
			event.stopPropagation();
			resizing.current = {
				direction,
				pointer: { x: event.clientX, y: event.clientY },
				frame: { ...currentRef.current, ...dimensionsRef.current },
			};
			event.currentTarget.setPointerCapture(event.pointerId);
		};

	const moveResize = (event: PointerEvent<HTMLDivElement>) => {
		const start = resizing.current;
		const parent = boxRef.current?.offsetParent;
		if (!start || !parent) return;
		const frame = resizeFrame(
			start.frame,
			start.direction,
			event.clientX - start.pointer.x,
			event.clientY - start.pointer.y,
			{ width: parent.clientWidth, height: parent.clientHeight },
			{ width: minWidth, height: minHeight },
		);
		currentRef.current = { x: frame.x, y: frame.y };
		dimensionsRef.current = { width: frame.width, height: frame.height };
		scheduleFrameWrite();
	};

	const endResize = () => {
		if (!resizing.current) return;
		resizing.current = null;
		commitGesture();
		onPositionChange(currentRef.current);
		onSizeChange?.(dimensionsRef.current);
	};

	const closeOnEscape = (event: KeyboardEvent) => {
		if (event.key === "Escape") onClose();
	};

	return (
		<Paper
			ref={boxRef}
			role="dialog"
			aria-label={title}
			elevation={6}
			onKeyDown={closeOnEscape}
			style={{
				left: current.x,
				top: current.y,
				width: resizable ? dimensions.width : width,
				height: resizable ? dimensions.height : undefined,
			}}
			sx={{
				position: "absolute",
				zIndex: 20,
				display: "flex",
				flexDirection: "column",
			}}
		>
			{resizable &&
				RESIZE_HANDLES.map(({ direction, cursor, sx }) => (
					<Box
						key={direction}
						data-resize-handle={direction}
						onPointerDown={startResize(direction)}
						onPointerMove={moveResize}
						onPointerUp={endResize}
						onPointerCancel={endResize}
						sx={{
							position: "absolute",
							zIndex: 2,
							cursor,
							touchAction: "none",
							...sx,
						}}
					/>
				))}
			<Box
				onPointerDown={startMove}
				onPointerMove={move}
				onPointerUp={endMove}
				onPointerCancel={endMove}
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 0.5,
					pl: 0.5,
					pr: 0.5,
					py: 0.5,
					borderBottom: "1px solid #e0e0e0",
					cursor: "move",
					touchAction: "none",
					userSelect: "none",
				}}
			>
				<DragIndicatorIcon fontSize="small" color="disabled" />
				<Typography variant="subtitle2" sx={{ flex: 1 }}>
					{title}
				</Typography>
				{actions}
				<IconButton
					size="small"
					onClick={onClose}
					aria-label={closeLabel}
					title={closeLabel}
					sx={{ p: 0.25 }}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
			{resizable ? (
				<Box
					sx={{
						flex: 1,
						minHeight: 0,
						position: "relative",
						overflow: "hidden",
					}}
				>
					{children}
				</Box>
			) : (
				children
			)}
		</Paper>
	);
};

export default FloatingBox;
