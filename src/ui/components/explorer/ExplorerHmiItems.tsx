"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Chip, Typography } from "@mui/material";
import { Fragment, useEffect } from "react";
import { useT } from "@/ui/i18n/useT";
import HmiIcon from "../icons/HmiIcon";
import CustomTreeItem from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import { ExplorerItemsProps } from "./explorer-items-props";
import { ExplorerContextMenuEventsOutHmiRename } from "./context-menu/explorer-context-menu-events";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";
import { useShallow } from "zustand/shallow";
import { useRenamableTreeItem } from "./useRenamableTreeItem";

const ExplorerHmiItem = ({
	hmiPageId,
	hmiPageName,
	isMain,
	styles,
	onContextMenu,
}: ExplorerItemsProps & {
	hmiPageId: string;
	hmiPageName: string;
	isMain: boolean;
}) => {
	const t = useT("explorer");
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const { labelMode, startEditing, onDoubleClick, inputProps } =
		useRenamableTreeItem({
			name: hmiPageName,
			designing,
			onRename: (name) => hmiManager.renameHmiPage(hmiPageId, name),
		});

	useEffect(() => {
		const handler = (e: ExplorerContextMenuEventsOutHmiRename) => {
			if (!designing) return;
			if (e.hmiPageId === hmiPageId) startEditing();
		};
		explorerContextMenuEventsOut.on("hmi-rename", handler);
		return () => explorerContextMenuEventsOut.off("hmi-rename", handler);
	}, [hmiPageId, designing, startEditing]);

	return (
		<CustomTreeItem
			key={hmiPageId}
			itemId={hmiPageId}
			label={hmiPageName}
			labelMode={labelMode}
			IconComponent={HmiIcon}
			trailing={
				isMain && (
					<Chip
						label={t("hmiMain")}
						size="small"
						color="primary"
						variant="outlined"
						sx={{
							ml: "auto",
							height: "18px",
							fontSize: "0.65rem",
							"& .MuiChip-label": { px: "6px" },
						}}
					/>
				)
			}
			styles={styles}
			onClick={() =>
				pagesManager.openPage({
					id: hmiPageId,
					type: "hmi",
					title: hmiPageName,
				})
			}
			onDoubleClick={onDoubleClick}
			inputProps={inputProps}
			onContextMenu={(e) => {
				e.preventDefault();
				e.stopPropagation();
				onContextMenu(e, { type: "hmi", hmiPageId });
			}}
		/>
	);
};

const ExplorerHmiItems = ({
	styles,
	onContextMenu,
}: ExplorerItemsProps) => {
	const t = useT("explorer");
	// `useShallow` sur des sélecteurs à valeurs primitives (ids, noms) pour éviter les
	// re-rendus infinis : un sélecteur retournant des objets reconstruits à chaque appel
	// ferait systématiquement échouer la comparaison superficielle de Zustand.
	const hmiPagesIds = useProjectStore(
		useShallow((state) =>
			state.project ? Object.keys(state.project.hmiPages) : [],
		),
	);
	const hmiPagesNames = useProjectStore(
		useShallow((state) =>
			state.project
				? Object.fromEntries(
						Object.values(state.project.hmiPages).map((p) => [p.id, p.name]),
					)
				: {},
		),
	);
	const mainHmiPageId = useProjectStore(
		(state) => state.project?.getMainHmiPage()?.id,
	);

	return (
		<Fragment>
			{hmiPagesIds.length === 0 ? (
				<Typography
					sx={{ padding: "3px 0 3px 33px", color: "gray", fontSize: "0.8rem" }}
				>
					{t("noHmiPages")}
				</Typography>
			) : (
				hmiPagesIds.map((hmiPageId) => (
					<ExplorerHmiItem
						key={hmiPageId}
						hmiPageId={hmiPageId}
						hmiPageName={hmiPagesNames[hmiPageId]}
						isMain={hmiPageId === mainHmiPageId}
						styles={styles}
						onContextMenu={onContextMenu}
					/>
				))
			)}
		</Fragment>
	);
};

export default ExplorerHmiItems;
