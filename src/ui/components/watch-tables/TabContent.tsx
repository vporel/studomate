"use client";

import { VariableDirection } from "@/schemas/variable/variable.schema";
import { Box } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../projects/ProjectContext";
import WatchVariable from "./WatchVariable";

export default function TabContent({ variableDirection }: { variableDirection: VariableDirection }) {
	const inputVariables = useProjectStore(
		useShallow((state) => state.project!.variables.filter((v) => v.getDirection() === variableDirection)),
	);
	const sortedInputVariables = [...inputVariables].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

	return (
		<Box>
			{sortedInputVariables.map((v) => {
				return <WatchVariable key={v.id} variable={v} />;
			})}
		</Box>
	);
}
