"use client";

import FolderIcon from "@mui/icons-material/Folder";
import { Box } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view";
import React, { useRef } from "react";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import ExplorerHeader from "./ExplorerHeader";
import ExplorerProgramsItems from "./ExplorerProgramsItems";
import ExplorerVariablesItems from "./ExplorerVariablesItems";
import ExplorerContextMenu from "./context-menu/ExplorerContextMenu";
import useExplorerContextMenu from "./useExplorerContextMenu";

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
	const explorerRef = useRef<HTMLDivElement>(null);
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
			<SimpleTreeView defaultExpandedItems={["variables", "programs"]}>
				<CustomTreeItem
					itemId="variables"
					label="Variables"
					IconComponent={FolderIcon}
					styles={treeItemStyles}
				>
					<ExplorerVariablesItems styles={treeItemStyles} onContextMenu={openContextMenu} />
				</CustomTreeItem>
				<CustomTreeItem
					itemId="programs"
					label="Programmes"
					IconComponent={FolderIcon}
					styles={treeItemStyles}
				>
					<ExplorerProgramsItems styles={treeItemStyles} onContextMenu={openContextMenu} />
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
