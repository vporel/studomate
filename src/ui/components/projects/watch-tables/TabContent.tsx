"use client";

import { VariableDirection } from "@/schemas/variable/variable.schema";
import { Box, Grid } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../ProjectContext";
import WatchVariable from "./WatchVariable";

export default function TabContent({ variableDirection }: { variableDirection: VariableDirection }) {
	const inputVariables = useProjectStore(
		useShallow((state) => state.project!.variables.filter((v) => v.getDirection() === variableDirection)),
	);
	const sortedInputVariables = [...inputVariables].sort((a, b) => a.mnemonic.localeCompare(b.mnemonic));

	const mid = Math.ceil(sortedInputVariables.length / 2);
	const left = sortedInputVariables.slice(0, mid);
	const right = sortedInputVariables.slice(mid);

	return (
		<Grid container spacing={2}>
			<Grid size={{ xs: 12, md: 6 }}>
				<Box>
					{left.map((v) => {
						return <WatchVariable key={v.id} variable={v} />;
					})}
				</Box>
			</Grid>
			<Grid size={{ xs: 12, md: 6 }}>
				<Box>
					{right.map((v) => {
						return <WatchVariable key={v.id} variable={v} />;
					})}
				</Box>
			</Grid>
		</Grid>
	);
}
