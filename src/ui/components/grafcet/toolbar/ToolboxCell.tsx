"use client";

import { Box } from "@mui/material";
import { ReactNode } from "react";

const ToolboxCell = ({ children }: { children: ReactNode }) => (
	<Box
		sx={{
			width: "30px",
			height: "30px",
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
		}}
	>
		{children}
	</Box>
);

export default ToolboxCell;
