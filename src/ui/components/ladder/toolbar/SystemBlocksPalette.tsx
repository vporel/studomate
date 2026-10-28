"use client";

import useCanEdit from "@/ui/components/projects/useCanEdit";
import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import FloatingBox, {
	type FloatingBoxPosition,
} from "@/ui/lib/boxes/FloatingBox";
import { useT } from "@/ui/i18n/useT";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import { Box } from "@mui/material";
import type { ComponentType } from "react";

export type SystemBlocksPalettePosition = FloatingBoxPosition;

/** Just under the toolbar. */
const TOP_OFFSET = 46;

/** Floating box listing every system block, to drag onto a ladder. It does not hide the editor, which receives the drops. */
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

	return (
		<FloatingBox
			title={t("title")}
			closeLabel={t("close")}
			position={position}
			onPositionChange={onPositionChange}
			onClose={onClose}
			top={TOP_OFFSET}
		>
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
		</FloatingBox>
	);
};

export default SystemBlocksPalette;
