"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";
import ToolboxCell from "./ToolboxCell";

const StepReferralTargetTool = ({ disabled }: { disabled?: boolean }) => {
	return (
		<GrafcetTool element={{ type: "step-referral-target" }} disabled={disabled}>
			<ToolboxCell>
				<Box
					sx={{
						width: "1px",
						height: "14px",
						marginTop: "6px",
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
			</ToolboxCell>
		</GrafcetTool>
	);
};

export default StepReferralTargetTool;
