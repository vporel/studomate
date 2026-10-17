"use client";

import { Box } from "@mui/material";

type ReferralArrowProps = {
	color: string;
	arrowTop: string;
};

const ReferralArrow = ({ color, arrowTop }: ReferralArrowProps) => (
	<Box
		sx={{
			width: "1px",
			height: "20px",
			background: color,
			position: "relative",
			"&::before, &::after": {
				content: '""',
				position: "absolute",
				width: "1px",
				height: "10px",
				background: color,
			},
			"&::before": {
				transform: "rotate(-45deg)",
				top: arrowTop,
				left: "-4px",
			},
			"&::after": {
				transform: "rotate(45deg)",
				top: arrowTop,
				left: "4px",
			},
		}}
	/>
);

export default ReferralArrow;
