"use client";

import { Typography } from "@mui/material";
import { Fragment, MouseEvent, useCallback, useEffect, useState } from "react";
import InclinedAccountTreeIcon from "../icons/InclinedAccountTree";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { usePagesContext } from "../pages/context/PagesContext";
import { useProjectContext } from "../projects/ProjectContext";
import { ExplorerContextMenuElement } from "./context-menu/explorer-context-menu";
import { ExplorerContextMenuEventsOutGrafcetRename } from "./context-menu/explorer-context-menu-events";
import { explorerContextMenuEventsOut } from "./context-menu/ExplorerContextMenu";

const ExplorerGrafcetItem = ({
	grafcet,
	styles,
	onContextMenu,
}: {
	grafcet: any;
	styles: CustomTreeItemStyles;
	onContextMenu: (event: MouseEvent, element: ExplorerContextMenuElement) => void;
}) => {
	const { openPage } = usePagesContext();
	const { renameGrafcet } = useProjectContext();
	const [labelMode, setLabelMode] = useState<"normal" | "edit">("normal");
	const [editingName, setEditingName] = useState(grafcet.name);

	const saveName = useCallback(() => {
		renameGrafcet(grafcet.id, editingName.trim() !== "" ? editingName.trim() : grafcet.name);
	}, [editingName, grafcet.id, grafcet.name, renameGrafcet]);

	useEffect(() => {
		const handler = (e: ExplorerContextMenuEventsOutGrafcetRename) => {
			if (e.grafcetId === grafcet.id) setLabelMode("edit");
		};
		explorerContextMenuEventsOut.on("grafcet-rename", handler);
		return () => {
			explorerContextMenuEventsOut.off("grafcet-rename", handler);
		};
	}, [grafcet.id]);

	return (
		<CustomTreeItem
			key={grafcet.id}
			itemId={grafcet.id}
			label={grafcet.name}
			labelMode={labelMode}
			IconComponent={InclinedAccountTreeIcon}
			styles={styles}
			onClick={() =>
				openPage(grafcet.id, {
					type: "grafcet",
					title: grafcet.name,
					grafcet: grafcet,
				})
			}
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
				onContextMenu(e, { type: "grafcet", grafcetId: grafcet.id });
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
	const { project } = useProjectContext();
	return (
		<Fragment>
			{Object.values(project!.grafcets).length === 0 ? (
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
				Object.values(project!.grafcets)
					.sort((a, b) => a.name.localeCompare(b.name))
					.map((grafcet) => (
						<ExplorerGrafcetItem
							key={grafcet.id}
							grafcet={grafcet}
							styles={styles}
							onContextMenu={onContextMenu}
						/>
					))
			)}
		</Fragment>
	);
};

export default ExplorerGrafcetsItems;
