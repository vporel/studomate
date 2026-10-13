"use client";

import { Box, Divider } from "@mui/material";
import React from "react";
import HomeTool from "./HomeTool";
import RedoTool from "./RedoTool";
import SaveTool from "./SaveTool";
import Scene3dTool from "./Scene3dTool";
import UndoTool from "./UndoTool";

const AppToolbar = ({ style }: { style?: React.CSSProperties }) => {
	return (
		<Box
			className="app-toolbar"
			style={{
				width: "auto",
				height: "30px",
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
				padding: "10px 5px",
				display: "flex",
				alignItems: "center",
				gap: "5px",
				...style,
			}}
		>
			<HomeTool />
			<SaveTool />
			<Divider orientation="vertical" style={{ margin: "10px 0" }} />
			<UndoTool />
			<RedoTool />
			<Scene3dTool />
		</Box>
	);
};

export default AppToolbar;
