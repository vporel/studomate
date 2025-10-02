"use client";

import { Box } from "@mui/material";

const StatusBar = () => {
	return (
		<Box
			className="status-bar"
			sx={{
				width: "100%",
				height: "30px",
				borderTop: "1px solid lightgray",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
				padding: "10px",
				background: "#efefff",
				zIndex: 100,
			}}
		>
			Statut
		</Box>
	);
};

export default StatusBar;
