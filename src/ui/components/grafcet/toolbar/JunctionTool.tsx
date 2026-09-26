"use client";

import { Box } from "@mui/material";
import GrafcetTool from "./GrafcetTool";

type JunctionToolProps = {
	type:
		| "junction-and-start"
		| "junction-and-end"
		| "junction-or-start"
		| "junction-or-end";
	disabled?: boolean;
};

const BAR_SX = { width: "100%", height: "1px", background: "black" };

const Stem = ({ height }: { height: string }) => (
	<Box sx={{ width: "1px", height, background: "black" }} />
);

const Legs = () => (
	<Box sx={{ width: "100%", height: "5px", position: "relative" }}>
		{["5%", "90%"].map((left) => (
			<Box
				key={left}
				sx={{
					width: "1px",
					height: "100%",
					background: "black",
					position: "absolute",
					left,
				}}
			/>
		))}
	</Box>
);

const JunctionTool = ({ type, disabled }: JunctionToolProps) => {
	const isStart = type.endsWith("start");
	const isAnd = type.startsWith("junction-and");
	const stem = <Stem height={isAnd ? "4px" : "5px"} />;
	const bars = (
		<>
			<Box sx={BAR_SX} />
			{isAnd && <Box sx={{ ...BAR_SX, marginTop: "1px" }} />}
		</>
	);

	return (
		<GrafcetTool element={{ type }} disabled={disabled}>
			<Box
				sx={{
					width: "40px",
					height: "35px",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				{isStart ? stem : <Legs />}
				{bars}
				{isStart ? <Legs /> : stem}
			</Box>
		</GrafcetTool>
	);
};

export default JunctionTool;
