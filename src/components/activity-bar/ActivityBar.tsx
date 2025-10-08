"use client";

import { Box } from "@mui/material";
import React from "react";

const ActivityToolbar = ({ style }: { style?: React.CSSProperties }) => {
	return (
		<Box
			className="activity-bar"
			style={{
				height: "100%",
				width: "200px",
				borderRight: "1px solid lightgray",
				backgroundColor: "white",
				padding: "10px",
				...style,
			}}
		></Box>
	);
};

export default ActivityToolbar;
