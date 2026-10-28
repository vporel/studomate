"use client";

import { Box } from "@mui/material";
import { useGrafcetStore } from "../context/GrafcetContext";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import GrafcetTool from "./GrafcetTool";

const StepTool = ({ initial }: { initial?: boolean }) => {
	const initialNodeExists = useGrafcetStore((state) =>
		state.nodes.some(
			(node) => node.type === "step" && StepHelper.isInitial(node.data),
		),
	);

	return (
		<GrafcetTool
			element={{ type: "step", extraData: { initial } }}
			disabled={initial && initialNodeExists}
		>
			<Box
				style={{
					width: "30px",
					height: "30px",
					border: !initial ? "1px solid black" : "4px double black",
					borderRadius: 5,
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				E
			</Box>
		</GrafcetTool>
	);
};

export default StepTool;
