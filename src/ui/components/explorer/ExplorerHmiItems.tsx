"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Chip, Typography } from "@mui/material";
import { Fragment, MouseEvent, useCallback, useEffect, useState } from "react";
import { useT } from "@/ui/i18n/useT";
import HmiIcon from "../icons/HmiIcon";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";
import { ExplorerContextMenuEventsOutHmiRename } from "./context-menu/explorer-context-menu-events";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";
import { useShallow } from "zustand/shallow";

const ExplorerHmiItem = ({
	hmiPageId,
	hmiPageName,
	isMain,
	styles,
	onContextMenu,
}: {
	hmiPageId: string;
	hmiPageName: string;
	isMain: boolean;
	styles: CustomTreeItemStyles;
	onContextMenu: (
		event: MouseEvent,
		element: ExplorerContextMenuElement,
	) => void;
}) => {
	const t = useT("explorer");
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const [labelMode, setLabelMode] = useState<"normal" | "edit">("normal");
	const [editingName, setEditingName] = useState(hmiPageName);

	const saveName = useCallback(() => {
		const trimmed =
			editingName.trim() !== "" ? editingName.trim() : hmiPageName;
		hmiManager.renameHmiPage(hmiPageId, trimmed);
	}, [editingName, hmiPageId, hmiPageName, hmiManager]);

	useEffect(() => {
		const handler = (e: ExplorerContextMenuEventsOutHmiRename) => {
			if (!designing) return;
			if (e.hmiPageId === hmiPageId) setLabelMode("edit");
		};
		explorerContextMenuEventsOut.on("hmi-rename", handler);
		return () => explorerContextMenuEventsOut.off("hmi-rename", handler);
	}, [hmiPageId, designing]);

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
			onDoubleClick={() => {
				if (!designing) return;
				setLabelMode("edit");
			}}
			inputProps={{
				value: editingName,
				onChange: (e) => setEditingName(e.target.value),
				onBlur: () => {
					setLabelMode("normal");
					saveName();
				},
				onKeyDown: (e) => {
					if (e.key === "Enter" || e.key === "Escape") {
						setLabelMode("normal");
						saveName();
					}
				},
			}}
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
}: {
	styles: CustomTreeItemStyles;
	onContextMenu: (
		event: MouseEvent,
		element: ExplorerContextMenuElement,
	) => void;
}) => {
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
