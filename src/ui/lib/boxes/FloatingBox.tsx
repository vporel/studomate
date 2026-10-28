"use client";

import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import {
	type KeyboardEvent,
	type PointerEvent,
	type ReactNode,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

export type FloatingBoxPosition = { x: number; y: number };

const EDGE_MARGIN = 8;

/**
 * Non-modal box that stays inside its positioned parent and moves by its header.
 *
 * It opens at `position`, or at the top right of its parent (`top` px from its upper edge) when
 * there is none, and reports where it was left (on opening and after each move) so that the
 * owner can restore it.
 */
const FloatingBox = ({
	title,
	closeLabel,
	position,
	onPositionChange,
	onClose,
	width = 200,
	top = EDGE_MARGIN,
	children,
}: {
	title: string;
	closeLabel: string;
	position: FloatingBoxPosition | null;
	onPositionChange: (position: FloatingBoxPosition) => void;
	onClose: () => void;
	width?: number;
	top?: number;
	children: ReactNode;
}) => {
	const boxRef = useRef<HTMLDivElement>(null);
	const [current, setCurrent] = useState<FloatingBoxPosition>(
		position ?? { x: EDGE_MARGIN, y: top },
	);
	const currentRef = useRef(current);
	const opening = useRef({ position, onPositionChange, top });
	const grab = useRef<{ x: number; y: number } | null>(null);

	const place = useCallback((next: FloatingBoxPosition) => {
		currentRef.current = next;
		setCurrent(next);
	}, []);

	const clampToParent = (x: number, y: number) => {
		const box = boxRef.current;
		const parent = box?.offsetParent;
		if (!box || !parent) return { x, y };
		const maxX = Math.max(0, parent.clientWidth - box.offsetWidth);
		const maxY = Math.max(0, parent.clientHeight - box.offsetHeight);
		return {
			x: Math.min(maxX, Math.max(0, x)),
			y: Math.min(maxY, Math.max(0, y)),
		};
	};

	useLayoutEffect(() => {
		const {
			position: remembered,
			onPositionChange: report,
			top: openingTop,
		} = opening.current;
		const box = boxRef.current;
		const parent = box?.offsetParent;
		if (!box || !parent) return;
		const start = remembered ?? {
			x: parent.clientWidth - box.offsetWidth - EDGE_MARGIN,
			y: openingTop,
		};
		const next = clampToParent(start.x, start.y);
		place(next);
		report(next);
	}, [place]);

	const startMove = (event: PointerEvent<HTMLDivElement>) => {
		if ((event.target as HTMLElement).closest("button")) return;
		grab.current = {
			x: event.clientX - current.x,
			y: event.clientY - current.y,
		};
		event.currentTarget.setPointerCapture(event.pointerId);
	};

	const move = (event: PointerEvent<HTMLDivElement>) => {
		const start = grab.current;
		if (!start) return;
		place(clampToParent(event.clientX - start.x, event.clientY - start.y));
	};

	const endMove = () => {
		if (!grab.current) return;
		grab.current = null;
		onPositionChange(currentRef.current);
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
			sx={{
				position: "absolute",
				left: current.x,
				top: current.y,
				zIndex: 20,
				width,
				display: "flex",
				flexDirection: "column",
			}}
		>
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
			{children}
		</Paper>
	);
};

export default FloatingBox;
