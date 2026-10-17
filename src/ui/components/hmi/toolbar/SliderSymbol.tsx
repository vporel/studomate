"use client";

import { Box } from "@mui/material";

const SliderSymbol = () => (
	<Box
		sx={{
			width: "100%",
			height: "100%",
			position: "relative",
			display: "flex",
			alignItems: "center",
			border: "2px solid #555",
			borderRadius: 1,
			backgroundColor: "#f5f5f5",
			px: "5px",
		}}
	>
		<Box
			sx={{
				width: "100%",
				height: 3,
				backgroundColor: "#ddd",
				borderRadius: 2,
				position: "relative",
			}}
		>
			<Box
				sx={{
					width: "40%",
					height: "100%",
					backgroundColor: "#1976d2",
					borderRadius: 2,
				}}
			/>
			<Box
				sx={{
					position: "absolute",
					left: "40%",
					top: "50%",
					width: 9,
					height: 9,
					borderRadius: "50%",
					backgroundColor: "#1976d2",
					transform: "translate(-50%, -50%)",
				}}
			/>
		</Box>
	</Box>
);

export default SliderSymbol;
