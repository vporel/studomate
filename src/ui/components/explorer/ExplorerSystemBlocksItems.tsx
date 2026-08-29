"use client";

import { SYSTEM_BLOCK_CATALOG } from "@/ui/components/ladder/system-blocks/system-block-catalog";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import { Fragment } from "react";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * Palette des blocs système disponibles — une entrée par `SYSTEM_BLOCK_CATALOG`. Glisser une
 * entrée vers le canevas d'un ladder ouvre sa fenêtre de configuration (tempo, compteur) ou insère
 * directement un bloc vide (compare, affectation, calcul) — voir `useLadderDropHandlers`.
 */
const ExplorerSystemBlocksItems = ({
	styles,
}: {
	styles: CustomTreeItemStyles;
}) => {
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

	return (
		<Fragment>
			{SYSTEM_BLOCK_CATALOG.map((entry) => (
				<CustomTreeItem
					key={entry.blockType}
					itemId={entry.explorerItemId}
					label={entry.explorerLabel}
					IconComponent={entry.ExplorerIcon}
					styles={styles}
					draggable={designing}
					onDragStart={
						designing
							? (e) => {
									e.dataTransfer.setData(
										LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE,
										entry.blockType,
									);
									e.dataTransfer.effectAllowed = "copy";
								}
							: undefined
					}
				/>
			))}
		</Fragment>
	);
};

export default ExplorerSystemBlocksItems;
