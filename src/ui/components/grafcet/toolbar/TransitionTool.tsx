"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";
import ToolboxCell from "./ToolboxCell";

const TransitionTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool element={{ type: "transition" }} disabled={disabled}>
			<ToolboxCell>
				<Box
					sx={{
						width: "1px",
						height: "25px",
						background: "black",
						position: "relative",
						"&::before": {
							content: '""',
							position: "absolute",
							width: "20px",
							height: "2px",
							background: "black",
							top: "50%",
							left: "-10px",
						},
					}}
				></Box>
			</ToolboxCell>
		</GrafcetTool>
	);
};

export default TransitionTool;
