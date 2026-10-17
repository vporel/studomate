"use client";
import { Box } from "@mui/material";

type JunctionHorizontalBarProps = {
	color: string;
	thickness: string;
	marginTop?: string;
};

const JunctionHorizontalBar = ({
	color,
	thickness,
	marginTop,
}: JunctionHorizontalBarProps) => (
	<Box
		sx={{ width: "100%", height: thickness, background: color, marginTop }}
	/>
);

export default JunctionHorizontalBar;
