"use client";

import FolderIcon from "@/ui/components/icons/FolderIcon";
import { Box } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view";
import React, { useMemo, useRef } from "react";
import { useT } from "@/ui/i18n/useT";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import ExplorerHeader from "./ExplorerHeader";
import ExplorerProgramsItems from "./ExplorerProgramsItems";
import ExplorerSystemBlockInstancesItems from "./ExplorerSystemBlockInstancesItems";
import ExplorerSystemBlocksItems from "./ExplorerSystemBlocksItems";
import ExplorerVariablesItems from "./ExplorerVariablesItems";
import ExplorerHmiItems from "./ExplorerHmiItems";
import ExplorerContextMenu from "./context-menu/ExplorerContextMenu";
import useExplorerContextMenu from "./useExplorerContextMenu";
import { useProjectStore } from "../projects/ProjectContext";

export const treeItemStyles: CustomTreeItemStyles = {
	root: {
		userSelect: "none",
	},
	label: {
		fontSize: "0.85rem",
	},
	icon: {
		fontSize: "1.1rem",
	},
	input: {
		fontSize: "0.85rem",
		height: "20px",
	},
};

const Explorer = ({ style }: { style?: React.CSSProperties }) => {
	const t = useT("explorer");
	const explorerRef = useRef<HTMLDivElement>(null);
	const project = useProjectStore((state) => state.project);
	const hasSystemBlockInstances = useMemo(
		() =>
			(project?.getAllTimerBlockElements().length ?? 0) > 0 ||
			(project?.getAllCounterBlockElements().length ?? 0) > 0,
		[project],
	);
	const {
		visible: contextMenuVisible,
		element: contextMenuElement,
		position: contextMenuPosition,
		openContextMenu,
		closeContextMenu,
	} = useExplorerContextMenu(explorerRef);

	return (
		<Box
			ref={explorerRef}
			className="explorer"
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: "rgb(250, 250, 250)",
				...style,
			}}
			onContextMenu={(e) => {
				e.preventDefault();
				openContextMenu(e, { type: "pane" });
			}}
		>
			<ExplorerHeader />
			<SimpleTreeView
				aria-label={t("ariaLabel")}
				defaultExpandedItems={["variables", "programs", "hmi"]}
			>
				<CustomTreeItem
					itemId="variables"
					label={t("sections.variables")}
					IconComponent={FolderIcon}
					styles={treeItemStyles}
				>
					<ExplorerVariablesItems
						styles={treeItemStyles}
						onContextMenu={openContextMenu}
					/>
				</CustomTreeItem>
				<CustomTreeItem
					itemId="programs"
					label={t("sections.programs")}
					IconComponent={FolderIcon}
					styles={treeItemStyles}
					onContextMenu={(e) => {
						e.preventDefault();
						e.stopPropagation();
						openContextMenu(e, { type: "programs-folder" });
					}}
				>
					<ExplorerProgramsItems
						styles={treeItemStyles}
						onContextMenu={openContextMenu}
					/>
				</CustomTreeItem>
				{hasSystemBlockInstances && (
					<CustomTreeItem
						itemId="system-block-instances"
						label={t("sections.blockInstances")}
						IconComponent={FolderIcon}
						styles={treeItemStyles}
					>
						<ExplorerSystemBlockInstancesItems
							styles={treeItemStyles}
							onContextMenu={openContextMenu}
						/>
					</CustomTreeItem>
				)}
				<CustomTreeItem
					itemId="system-blocks"
					label={t("sections.systemBlocks")}
					IconComponent={FolderIcon}
					styles={treeItemStyles}
				>
					<ExplorerSystemBlocksItems styles={treeItemStyles} />
				</CustomTreeItem>
				<CustomTreeItem
					itemId="hmi"
					label={t("sections.hmi")}
					IconComponent={FolderIcon}
					styles={treeItemStyles}
					onContextMenu={(e) => {
						e.preventDefault();
						e.stopPropagation();
						openContextMenu(e, { type: "hmi-folder" });
					}}
				>
					<ExplorerHmiItems
						styles={treeItemStyles}
						onContextMenu={openContextMenu}
					/>
				</CustomTreeItem>
			</SimpleTreeView>
			{explorerRef.current && (
				<ExplorerContextMenu
					visible={contextMenuVisible}
					element={contextMenuElement}
					position={contextMenuPosition}
					onClose={closeContextMenu}
					explorerWidth={window.innerWidth}
					explorerHeight={window.innerHeight}
				/>
			)}
		</Box>
	);
};

export default Explorer;
