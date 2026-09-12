"use client";

import { Box } from "@mui/material";

const GaugeSymbol = () => (
	<Box
		sx={{
			width: "100%",
			height: "100%",
			display: "flex",
			alignItems: "center",
			border: "2px solid #555",
			borderRadius: 1,
			backgroundColor: "#f5f5f5",
			px: "3px",
		}}
	>
		<Box
			sx={{
				width: "100%",
				height: 8,
				backgroundColor: "#ddd",
				borderRadius: 4,
				overflow: "hidden",
			}}
		>
			<Box
				sx={{
					width: "40%",
					height: "100%",
					backgroundColor: "#1976d2",
					borderRadius: 4,
				}}
			/>
		</Box>
	</Box>
);

export default GaugeSymbol;
