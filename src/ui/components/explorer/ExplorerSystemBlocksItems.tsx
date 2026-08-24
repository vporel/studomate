"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE } from "@/ui/utils/ladder/ladder-system-block-drag";
import ArrowRightAltOutlinedIcon from "@mui/icons-material/ArrowRightAltOutlined";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import NumbersOutlinedIcon from "@mui/icons-material/NumbersOutlined";
import TimerOutlinedIcon from "@mui/icons-material/TimerOutlined";
import { Fragment } from "react";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";

/**
 * Palette des blocs système disponibles — tempo, compteur, compare et affectation. Glisser une
 * entrée vers le canevas d'un ladder ouvre la fenêtre de configuration du bloc correspondant (voir
 * `useLadderDropHandlers`/`TimerBlockDialog`/`CounterBlockDialog`/`CompareBlockDialog`/
 * `AssignBlockDialog`), qui seule dispatche l'insertion.
 */
const ExplorerSystemBlocksItems = ({ styles }: { styles: CustomTreeItemStyles }) => {
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

	return (
		<Fragment>
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
			<CustomTreeItem
				itemId="system-block-counter"
				label="Compteur"
				IconComponent={NumbersOutlinedIcon}
				styles={styles}
				draggable={designing}
				onDragStart={
					designing
						? (e) => {
								e.dataTransfer.setData(LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE, "counter");
								e.dataTransfer.effectAllowed = "copy";
							}
						: undefined
				}
			/>
			<CustomTreeItem
				itemId="system-block-compare"
				label="Comparaison"
				IconComponent={CompareArrowsOutlinedIcon}
				styles={styles}
				draggable={designing}
				onDragStart={
					designing
						? (e) => {
								e.dataTransfer.setData(LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE, "compare");
								e.dataTransfer.effectAllowed = "copy";
							}
						: undefined
				}
			/>
			<CustomTreeItem
				itemId="system-block-assign"
				label="Affectation"
				IconComponent={ArrowRightAltOutlinedIcon}
				styles={styles}
				draggable={designing}
				onDragStart={
					designing
						? (e) => {
								e.dataTransfer.setData(LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE, "assign");
								e.dataTransfer.effectAllowed = "copy";
							}
						: undefined
				}
			/>
		</Fragment>
	);
};

export default ExplorerSystemBlocksItems;
