"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

const ActionTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool type="action" disabled={disabled}>
			<Box
				style={{
					width: "60px",
					height: "30px",
					border: "1px solid black",
					borderRadius: 5,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				A
			</Box>
		</GrafcetTool>
	);
};

export default ActionTool;
