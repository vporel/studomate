"use client";

import Variable from "@/schemas/variable/variable.schema";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Dialect } from "@/expression-language/dialect.enum";
import { FormControlLabel, Switch, TextField, Typography } from "@mui/material";
import { useProjectStore } from "../projects/ProjectContext";

//VRAI/TRUE relève du vocabulaire du langage d'expression, pas de la langue de l'interface
function getBooleanLabel(value: boolean | undefined, dialect: Dialect) {
	if (value === undefined) return "-";
	if (value) return dialect === Dialect.FR ? "VRAI" : "TRUE";
	else return dialect === Dialect.FR ? "FAUX" : "FALSE";
}

export default function WatchVariable({ variable }: { variable: Variable }) {
	const dialect = useProjectStore((s) => s.project?.dialect ?? Dialect.FR);
	const simulationManager = useProjectStore((s) => s.simulationManager);
	const value = useProjectStore(
		(state) => state.simulationVariablesStates[variable.id]?.value,
	);
	const nativeType = variable.getNativeType();

	const changeValue = (newValue: any) => {
		if (variable.getDirection() === "IN") {
			simulationManager.setPhysicalInputValue(variable.id, newValue);
		} else {
			simulationManager.setMemoryValue(variable.id, newValue);
		}
	};

	return (
		<FlexBox key={variable.id} between centerVertical sx={{ mb: 1, gap: 2 }}>
			<Typography variant="subtitle2" sx={{ width: "100px" }}>
				{variable.mnemonic}
			</Typography>
			<FlexBox centerVertical sx={{ gap: 1.5 }}>
				<Typography
					sx={{
						width: "40px",
						textAlign: "center",
						border: "1px solid gray",
						px: "3px",
						borderRadius: "5px",
						fontSize: ".6rem",
					}}
				>
					{variable.type}
				</Typography>
				<FlexBox centerVertical centerHorizontal sx={{ width: "100px" }}>
					{nativeType === "boolean" ? (
						variable.getDirection() === "OUT" ? (
							<Typography
								color={value === true ? "primary.main" : "text.primary"}
							>
								{getBooleanLabel(value, dialect)}
							</Typography>
						) : (
							<FormControlLabel
								control={
									<Switch
										checked={!!value}
										onChange={(e) => {
											changeValue(e.target.checked);
										}}
									/>
								}
								label={getBooleanLabel(value, dialect)}
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
								let newValue =
									nativeType === "number"
										? Number(e.target.value)
										: e.target.value;
								if (nativeType === "number" && variable.type !== "REAL")
									newValue = parseInt(newValue.toString(), 10);
								changeValue(newValue);
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
						/>
					)}
				</FlexBox>
			</FlexBox>
		</FlexBox>
	);
}
