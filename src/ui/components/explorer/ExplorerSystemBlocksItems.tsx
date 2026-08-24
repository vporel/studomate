"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * Palette des blocs système disponibles — un seul pour l'instant (tempo). Glisser cette entrée
 * vers le canevas d'un ladder ouvre la fenêtre de configuration du bloc (voir
 * `useLadderDropHandlers`/`TimerBlockDialog`), qui seule dispatche l'insertion.
 */
const ExplorerSystemBlocksItems = ({ styles }: { styles: CustomTreeItemStyles }) => {
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

	return (
		<CustomTreeItem
			itemId="system-block-timer"
			label="Temporisation"
			IconComponent={TimerOutlinedIcon}
			styles={styles}
			draggable={designing}
			onDragStart={
				designing
					? (e) => {
							e.dataTransfer.setData(LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE, "timer");
							e.dataTransfer.effectAllowed = "copy";
						}
					: undefined
			}
		/>
	);
};

export default ExplorerSystemBlocksItems;
