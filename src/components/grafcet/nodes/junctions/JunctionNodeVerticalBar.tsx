"use client";
import { Box } from "@mui/material";

const JunctionNodeVerticalBar = ({
	color,
	left,
	selected,
}: {
	color: string;
	left: number;
	selected?: boolean;
}) => {
	return (
		<>
			<Box
				component="div"
				sx={{
					position: "absolute",
					width: selected ? "4px" : "1px",
					background: selected ? "red" : color,
					height: "100%",
					left: (selected ? left - 2 : left - 0.5) + "px",
				}}
			/>
		</>
	);
};

export default JunctionNodeVerticalBar;
