"use client";

import useCanEdit from "@/ui/components/projects/useCanEdit";
import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import { useT } from "@/ui/i18n/useT";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import CloseIcon from "@mui/icons-material/Close";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Box, IconButton, Paper, Typography } from "@mui/material";
import {
	type ComponentType,
	type KeyboardEvent,
	type PointerEvent,
	useCallback,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

export type SystemBlocksPalettePosition = { x: number; y: number };

/** Just under the toolbar. */
const TOP_OFFSET = 46;
const EDGE_MARGIN = 8;

/**
 * Floating box listing every system block, to drag onto a ladder. It stays inside its positioned
 * parent and moves by its header. It does not hide the editor, which receives the drops.
 *
 * It opens at `position`, or at the top right of its parent when there is none, and reports
 * where it was left (on opening and after each move) so that the owner can restore it.
 */
const SystemBlocksPalette = ({
	position,
	onPositionChange,
	onClose,
}: {
	position: SystemBlocksPalettePosition | null;
	onPositionChange: (position: SystemBlocksPalettePosition) => void;
	onClose: () => void;
}) => {
	const t = useT("ladderEditor.systemBlocksPalette");
	const tsb = useT("ladderEditor.systemBlocks");
	const canEdit = useCanEdit();
	const boxRef = useRef<HTMLDivElement>(null);
	const [current, setCurrent] = useState<SystemBlocksPalettePosition>(
		position ?? { x: EDGE_MARGIN, y: TOP_OFFSET },
	);
	const currentRef = useRef(current);
	const opening = useRef({ position, onPositionChange });
	const grab = useRef<{ x: number; y: number } | null>(null);

	const place = useCallback((next: SystemBlocksPalettePosition) => {
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
		const { position: remembered, onPositionChange: report } = opening.current;
		const box = boxRef.current;
		const parent = box?.offsetParent;
		if (!box || !parent) return;
		const start = remembered ?? {
			x: parent.clientWidth - box.offsetWidth - EDGE_MARGIN,
			y: TOP_OFFSET,
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
			aria-label={t("title")}
			elevation={6}
			onKeyDown={closeOnEscape}
			sx={{
				position: "absolute",
				left: current.x,
				top: current.y,
				zIndex: 20,
				width: 200,
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
					{t("title")}
				</Typography>
				<IconButton
					size="small"
					onClick={onClose}
					aria-label={t("close")}
					title={t("close")}
					sx={{ p: 0.25 }}
				>
					<CloseIcon fontSize="small" />
				</IconButton>
			</Box>
			<Box component="ul" sx={{ listStyle: "none", m: 0, p: 0.5 }}>
				{SYSTEM_BLOCK_CATALOG.map((entry) => {
					const Icon = entry.ExplorerIcon as ComponentType<{
						fontSize?: "small";
					}>;
					return (
						<Box
							component="li"
							key={entry.blockType}
							data-block-type={entry.blockType}
							draggable={canEdit}
							onDragStart={(event) => {
								event.dataTransfer.setData(
									LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
									entry.blockType,
								);
								event.dataTransfer.effectAllowed = "copy";
							}}
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 1,
								px: 1,
								py: 0.5,
								fontSize: "0.85rem",
								cursor: canEdit ? "grab" : "not-allowed",
								opacity: canEdit ? 1 : 0.4,
								userSelect: "none",
								"&:hover": { background: "rgb(240, 240, 240)" },
							}}
						>
							<Icon fontSize="small" />
							{tsb(entry.explorerLabelKey as never)}
						</Box>
					);
				})}
			</Box>
		</Paper>
	);
};

export default SystemBlocksPalette;
