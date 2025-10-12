"use client";

import FolderIcon from "@mui/icons-material/Folder";
import { Box, Typography } from "@mui/material";
import { SimpleTreeView } from "@mui/x-tree-view";
import React from "react";
import InclinedAccountTreeIcon from "../icons/InclinedAccountTree";
import CustomTreeItem, { CustomTreeItemStyles } from "../mui/CustomTreeItem";
import { useProjectContext } from "../projects/ProjectContext";
import ExplorerHeader from "./ExplorerHeader";

const treeItemStyles: CustomTreeItemStyles = {
	root: {
		userSelect: "none",
	},
	label: {
		fontSize: "0.9rem",
	},
	icon: {
		fontSize: "1.1rem",
	},
};

const Explorer = ({ style }: { style?: React.CSSProperties }) => {
	const { project } = useProjectContext();

	return (
		<Box
			className="explorer"
			style={{
				height: "100%",
				width: "100%",
				backgroundColor: "rgb(250, 250, 250)",
				...style,
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
						Object.values(project!.grafcets).map((grafcet) => (
							<CustomTreeItem
								key={grafcet.id}
								itemId={grafcet.id}
								label={grafcet.name}
								IconComponent={InclinedAccountTreeIcon}
								styles={treeItemStyles}
							/>
						))
					)}
				</CustomTreeItem>
			</SimpleTreeView>
		</Box>
	);
};

export default Explorer;
