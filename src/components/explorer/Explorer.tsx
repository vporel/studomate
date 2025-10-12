"use client";

import FolderIcon from "@mui/icons-material/Folder";
import { Box } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view";
import React, { useRef } from "react";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import ExplorerGrafcetsItems from "./ExplorerGrafcetsItems";
import ExplorerHeader from "./ExplorerHeader";
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
			<SimpleTreeView defaultExpandedItems={["grafcets"]}>
				<CustomTreeItem
					itemId="grafcets"
					label="Grafcets"
					IconComponent={FolderIcon}
					styles={treeItemStyles}
				>
					<ExplorerGrafcetsItems styles={treeItemStyles} onContextMenu={openContextMenu} />
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
