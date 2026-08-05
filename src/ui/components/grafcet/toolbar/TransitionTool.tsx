"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

const TransitionTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool element={{ type: "transition" }} disabled={disabled}>
			<Box
				style={{
					width: "30px",
					height: "30px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
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
			</Box>
		</GrafcetTool>
	);
};

export default TransitionTool;
