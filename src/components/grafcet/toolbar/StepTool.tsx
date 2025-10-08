"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

const StepTool = ({ initial, disabled }: { initial?: boolean; disabled?: boolean }) => {
	return (
		<GrafcetTool type="step" disabled={disabled}>
			<Box
				style={{
					width: "30px",
					height: "30px",
					border: !initial ? "1px solid black" : "4px double black",
					borderRadius: 5,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				E
			</Box>
		</GrafcetTool>
	);
};

export default StepTool;
