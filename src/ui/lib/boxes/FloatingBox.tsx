"use client";

import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import { clamp } from "@/lib/number";
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

/** The corner of its parent a box is positioned from. */
export type FloatingBoxAnchor =
	"top-left" | "top-right" | "bottom-left" | "bottom-right";

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const EDGE_MARGIN = 8;
const HANDLE_THICKNESS = 6;
const HANDLE_CORNER = 14;
const DEFAULT_MIN_WIDTH = 160;
const DEFAULT_MIN_HEIGHT = 100;
const DEFAULT_WIDTH = 200;
const DEFAULT_HEIGHT = 240;
const DEFAULT_Z_INDEX = 20;

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

/** A box that is resized is positioned from its top left corner only. */
type Anchoring =
	| { anchor?: "top-left" }
	| { anchor: Exclude<FloatingBoxAnchor, "top-left">; resizable?: false };

/** The close button and its label come together, or not at all. */
type Closable =
	| { onClose: () => void; closeLabel: string }
	| { onClose?: undefined; closeLabel?: undefined };

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
		frame.width = clamp(start.width + dx, min.width, parent.width - start.x);
	}
	if (direction.includes("w")) {
		const right = start.x + start.width;
		frame.width = clamp(start.width - dx, min.width, right);
		frame.x = right - frame.width;
	}
	if (direction.includes("s")) {
		frame.height = clamp(
			start.height + dy,
			min.height,
			parent.height - start.y,
		);
	}
	if (direction.includes("n")) {
		const bottom = start.y + start.height;
		frame.height = clamp(start.height - dy, min.height, bottom);
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
 * With an `anchor` other than the default `"top-left"`, the box is positioned from that corner of
 * its parent: `position.x` and `position.y` are its distances to the horizontal and vertical
 * edges of that corner, and `top` the distance to the vertical one. Resizing its parent then
 * moves the box with that corner, and a parent that becomes too small brings it back inside.
 * Only a box that is not `resizable` can be anchored to another corner.
 *
 * It offers a close button (and closes on Escape) only when it has an `onClose`: the owner then
 * puts any other header control in `actions`.
 *
 * A non-resizable box is `width` px wide, or as wide as its content when `width` is `"auto"`.
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
	width = DEFAULT_WIDTH,
	height = DEFAULT_HEIGHT,
	size = null,
	onSizeChange,
	resizable = false,
	minWidth = DEFAULT_MIN_WIDTH,
	minHeight = DEFAULT_MIN_HEIGHT,
	top = EDGE_MARGIN,
	anchor = "top-left",
	zIndex = DEFAULT_Z_INDEX,
	onActivate,
	actions,
	children,
}: {
	title: string;
	position: FloatingBoxPosition | null;
	onPositionChange: (position: FloatingBoxPosition) => void;
	width?: number | "auto";
	/** Initial height of a resizable box. */
	height?: number;
	size?: FloatingBoxSize | null;
	onSizeChange?: (size: FloatingBoxSize) => void;
	resizable?: boolean;
	minWidth?: number;
	minHeight?: number;
	top?: number;
	zIndex?: number;
	/** Called when the pointer goes down anywhere in the box
	 * useCase : bring the box to the front in case of many floating boxes sharing the same space.
	 */
	onActivate?: () => void;
	/** Buttons shown in the header, before the close button. */
	actions?: ReactNode;
	children: ReactNode;
} & Closable &
	Anchoring) => {
	const boxRef = useRef<HTMLDivElement>(null);
	const fromRight = anchor.endsWith("right");
	const fromBottom = anchor.startsWith("bottom");
	const horizontalSign = fromRight ? -1 : 1;
	const verticalSign = fromBottom ? -1 : 1;
	const horizontalEdge = fromRight ? "right" : "left";
	const verticalEdge = fromBottom ? "bottom" : "top";
	const [current, setCurrent] = useState<FloatingBoxPosition>(
		position ?? { x: EDGE_MARGIN, y: top },
	);
	const [dimensions, setDimensions] = useState<FloatingBoxSize>(
		size ?? { width: width === "auto" ? DEFAULT_WIDTH : width, height },
	);
	const currentRef = useRef(current);
	const dimensionsRef = useRef(dimensions);
	const opening = useRef({
		position,
		onPositionChange,
		onSizeChange,
		top,
		anchor,
		minWidth,
		minHeight,
	});
	const grab = useRef<{
		pointer: FloatingBoxPosition;
		start: FloatingBoxPosition;
	} | null>(null);
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
		box.style[horizontalEdge] = `${currentRef.current.x}px`;
		box.style[verticalEdge] = `${currentRef.current.y}px`;
		if (resizable) {
			box.style.width = `${dimensionsRef.current.width}px`;
			box.style.height = `${dimensionsRef.current.height}px`;
		}
	}, [resizable, horizontalEdge, verticalEdge]);

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
			x: clamp(x, 0, maxX),
			y: clamp(y, 0, maxY),
		};
	};

	useLayoutEffect(() => {
		const {
			position: remembered,
			onPositionChange: report,
			onSizeChange: reportSize,
			top: openingTop,
			anchor: openingAnchor,
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
		const start =
			remembered ??
			(openingAnchor === "top-left"
				? {
						x: parent.clientWidth - fitted.width - EDGE_MARGIN,
						y: openingTop,
					}
				: { x: EDGE_MARGIN, y: openingTop });
		const next = clampToParent(start.x, start.y, fitted.width, fitted.height);
		place(next);
		report(next);
	}, [place, resize, resizable]);

	useEffect(() => {
		const box = boxRef.current;
		const parent = box?.offsetParent;
		if (anchor === "top-left" || !box || !parent) return;
		if (typeof ResizeObserver === "undefined") return;
		const observer = new ResizeObserver(() => {
			if (grab.current) return;
			const before = currentRef.current;
			const fitted = clampToParent(before.x, before.y);
			if (fitted.x === before.x && fitted.y === before.y) return;
			place(fitted);
			onPositionChange(fitted);
		});
		observer.observe(parent);
		return () => observer.disconnect();
	}, [anchor, place, onPositionChange]);

	const startMove = (event: PointerEvent<HTMLDivElement>) => {
		if ((event.target as HTMLElement).closest("button")) return;
		grab.current = {
			pointer: { x: event.clientX, y: event.clientY },
			start: currentRef.current,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const move = (event: PointerEvent<HTMLDivElement>) => {
		const start = grab.current;
		if (!start) return;
		currentRef.current = clampToParent(
			start.start.x + horizontalSign * (event.clientX - start.pointer.x),
			start.start.y + verticalSign * (event.clientY - start.pointer.y),
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
		if (event.key === "Escape") onClose?.();
	};

	return (
		<Paper
			ref={boxRef}
			role="dialog"
			aria-label={title}
			elevation={6}
			onKeyDown={closeOnEscape}
			onPointerDownCapture={onActivate}
			style={{
				[horizontalEdge]: current.x,
				[verticalEdge]: current.y,
				width: resizable ? dimensions.width : width,
				height: resizable ? dimensions.height : undefined,
			}}
			sx={{
				position: "absolute",
				zIndex,
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
				{onClose && (
					<IconButton
						size="small"
						onClick={onClose}
						aria-label={closeLabel}
						title={closeLabel}
						sx={{ p: 0.25 }}
					>
						<CloseIcon fontSize="small" />
					</IconButton>
				)}
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
