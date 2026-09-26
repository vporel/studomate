"use client";

import { Typography } from "@mui/material";

type HmiWidgetLabelProps = {
	label?: string;
	hidden?: boolean;
};

const HmiWidgetLabel = ({ label, hidden }: HmiWidgetLabelProps) => {
	if (hidden || !label) return null;
	return (
		<Typography
			sx={{
				position: "absolute",
				top: "100%",
				left: "50%",
				transform: "translateX(-50%)",
				width: "max-content",
				maxWidth: "none",
				mt: 0.5,
				fontSize: "0.7rem",
				color: "#333",
				textAlign: "center",
				whiteSpace: "nowrap",
			}}
		>
			{label}
		</Typography>
	);
};

export default HmiWidgetLabel;
