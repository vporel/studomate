"use client";

import { Box } from "@mui/material";

const LineSymbol = () => (
	<Box
		sx={{
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
		}}
	>
		<Box sx={{ width: "100%", height: 2, backgroundColor: "#555" }} />
	</Box>
);

export default LineSymbol;
