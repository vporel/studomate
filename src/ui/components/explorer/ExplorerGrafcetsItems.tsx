"use client";

import { Typography } from "@mui/material";
import { Fragment, MouseEvent, useCallback, useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import InclinedAccountTreeIcon from "../icons/InclinedAccountTree";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectStore } from "../projects/ProjectContext";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";
import { ExplorerContextMenuEventsOutGrafcetRename } from "./context-menu/explorer-context-menu-events";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";

const ExplorerGrafcetItem = ({
	grafcetId,
	grafcetName,
	styles,
	onContextMenu,
}: {
	grafcetId: string;
	grafcetName: string;
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const [labelMode, setLabelMode] = useState<"normal" | "edit">("normal");
	const [editingName, setEditingName] = useState(grafcetName);

	const saveName = useCallback(() => {
		grafcetsManager.renameGrafcet(
			grafcetId,
			editingName.trim() !== "" ? editingName.trim() : grafcetName,
		);
	}, [editingName, grafcetId, grafcetName, grafcetsManager]);

	useEffect(() => {
		const handler = (e: ExplorerContextMenuEventsOutGrafcetRename) => {
			if (e.grafcetId === grafcetId) setLabelMode("edit");
		};
		explorerContextMenuEventsOut.on("grafcet-rename", handler);
		return () => {
			explorerContextMenuEventsOut.off("grafcet-rename", handler);
		};
	}, [grafcetId]);

	return (
		<CustomTreeItem
			key={grafcetId}
			itemId={grafcetId}
			label={grafcetName}
			labelMode={labelMode}
			IconComponent={InclinedAccountTreeIcon}
			styles={styles}
			onClick={() =>
				pagesManager.openPage({
					id: grafcetId,
					type: "grafcet",
					title: grafcetName,
				})
			}
			onDoubleClick={() => {
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
				onContextMenu(e, { type: "grafcet", grafcetId: grafcetId });
			}}
		/>
	);
};

const ExplorerGrafcetsItems = ({
	styles,
	onContextMenu,
}: {
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const grafcetsIds = useProjectStore(
		useShallow((state) => (state.project ? Object.keys(state.project.grafcets) : [])),
	);
	const grafcetsNames = useProjectStore(
		useShallow((state) =>
			state.project
				? Object.fromEntries(Object.values(state.project.grafcets).map((g) => [g.id, g.name]))
				: {},
		),
	);

	const grafcets: { id: string; name: string }[] = [];
	for (const id of grafcetsIds) {
		grafcets.push({ id, name: grafcetsNames[id] });
	}

	return (
		<Fragment>
			{grafcetsIds.length === 0 ? (
				<Typography
					sx={{
						padding: "3px 0 3px 33px",
						color: "gray",
						fontSize: "0.8rem",
					}}
				>
					Aucun grafcet
				</Typography>
			) : (
				grafcets
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((grafcet) => (
						<ExplorerGrafcetItem
							key={grafcet.id}
							grafcetId={grafcet.id}
							grafcetName={grafcet.name}
							styles={styles}
							onContextMenu={onContextMenu}
						/>
					))
			)}
		</Fragment>
	);
};

export default ExplorerGrafcetsItems;
