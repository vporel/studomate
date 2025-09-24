"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

const StepReferralTargetTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool type="step-referral-target" disabled={disabled}>
			<Box
				style={{
					width: "40px",
					height: "40px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<Box
					sx={{
						width: "1px",
						height: "14px",
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
							top: "-7px",
							left: "-3px",
						},
						"&::after": {
							transform: "rotate(45deg)",
							top: "-7px",
							left: "4px",
						},
					}}
				></Box>
			</Box>
		</GrafcetTool>
	);
};

export default StepReferralTargetTool;
