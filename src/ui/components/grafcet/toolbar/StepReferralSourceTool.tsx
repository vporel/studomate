"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

const StepReferralSourceTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool element={{ type: "step-referral-source" }} disabled={disabled}>
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
						height: "20px",
						background: "black",
						position: "relative",
						"&::before, &::after": {
							content: '""',
							position: "absolute",
							width: "1px",
							height: "10px",
							background: "black",
						},
						"&::before": {
							transform: "rotate(-45deg)",
							top: "10px",
							left: "-3px",
						},
						"&::after": {
							transform: "rotate(45deg)",
							top: "10px",
							left: "4px",
						},
					}}
				></Box>
			</Box>
		</GrafcetTool>
	);
};

export default StepReferralSourceTool;
