"use client";

import Variable from "@/schemas/variable/variable.schema";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Language } from "@/ui/locales/locales";
import { Box, FormControlLabel, Switch, TextField, Typography } from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../ProjectContext";

function getBooleanLabel(value: boolean | undefined, language: Language) {
	if (value === undefined) return "-";
	if (value) return language === Language.FR ? "VRAI" : "TRUE";
	else return language === Language.FR ? "FAUX" : "FALSE";
}

export default function WatchVariable({ variable }: { variable: Variable }) {
	const language = useProjectStore((s) => s.language);
	const simulationManager = useProjectStore((s) => s.simulationManager);
	const value = useProjectStore(useShallow((state) => state.simulationVariablesStates[variable.id]?.value));
	const nativeType = variable.getNativeType();

	return (
		<FlexBox key={variable.id} centerVertical sx={{ p: 1, mb: 1, gap: 2 }}>
			<Typography variant="subtitle2">{variable.mnemonic}</Typography>
			<Typography sx={{ border: "1px solid gray", px: "3px", borderRadius: "5px", fontSize: ".7rem" }}>
				{variable.type}
			</Typography>
			<Box sx={{ flexGrow: 1 }}>
				{nativeType === "boolean" ? (
					variable.getDirection() === "OUT" ? (
						<Typography color={value === true ? "primary.main" : "text.primary"}>
							{getBooleanLabel(value, language)}
						</Typography>
					) : (
						<FormControlLabel
							control={
								<Switch
									checked={!!value}
									onChange={(e) =>
										simulationManager.setPhysicalInputValue(variable.id, e.target.checked)
									}
								/>
							}
							label={getBooleanLabel(value, language)}
						/>
					)
				) : variable.getDirection() === "OUT" ? (
					<Typography>{value === undefined ? "-" : String(value)}</Typography>
				) : (
					<TextField
						size="small"
						type={nativeType === "number" ? "number" : "text"}
						value={value === undefined ? "" : String(value)}
						onChange={(e) => {
							let newValue = nativeType === "number" ? Number(e.target.value) : e.target.value;
							if (nativeType === "number" && variable.type !== "REAL")
								newValue = parseInt(newValue.toString(), 10);
							simulationManager.setPhysicalInputValue(variable.id, newValue);
						}}
						onKeyDown={(e) => {
							//The textfield type already prevents non-numeric input for type="number"
							//but we also need to prevent real values when variable.type !== "REAL"
							if (nativeType === "number" && variable.type !== "REAL") {
								if (e.key === "." || e.key === "e" || e.key === "E") {
									e.preventDefault();
								}
							}
						}}
						fullWidth
					/>
				)}
			</Box>
		</FlexBox>
	);
}
