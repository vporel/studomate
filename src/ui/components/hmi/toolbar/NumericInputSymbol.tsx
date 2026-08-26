"use client";

import { Box, Typography } from "@mui/material";

const NumericInputSymbol = () => (
	<Box
		sx={{
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			border: "2px solid #555",
			borderRadius: 1,
			backgroundColor: "#fff",
		}}
	>
		<Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#333", lineHeight: 1 }}>0</Typography>
	</Box>
);

export default NumericInputSymbol;
