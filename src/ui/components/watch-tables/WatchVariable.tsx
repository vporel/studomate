"use client";

import Variable from "@/schemas/variable/variable.schema";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Dialect } from "@/expression-language/dialect.enum";
import {
	getInputRestValue,
	isNormallyClosed,
	isPushButtonBehavior,
} from "@/schemas/variable/input-behavior";
import { formatBooleanValue } from "@/ui/lib/variables/format-variable-value";
import {
	Box,
	Button,
	FormControlLabel,
	Slider,
	Switch,
	TextField,
	Typography,
} from "@mui/material";
import { useRef } from "react";
import { useProjectStore } from "../projects/ProjectContext";

export default function WatchVariable({ variable }: { variable: Variable }) {
	const dialect = useProjectStore((s) => s.project?.dialect ?? Dialect.FR);
	const simulationManager = useProjectStore((s) => s.simulationManager);
	const value = useProjectStore(
		(state) => state.simulationVariablesStates[variable.id]?.value,
	);
	const nativeType = variable.getNativeType();
	const behavior = variable.behavior;
	const normallyClosed = isNormallyClosed(behavior);

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
					{behavior?.kind === "slider" ? (
						<FlexBox centerVertical sx={{ width: "100%", gap: 1 }}>
							<Slider
								size="small"
								min={behavior.params.min}
								max={behavior.params.max}
								step={1}
								value={typeof value === "number" ? value : 0}
								onChange={(_, next) => changeValue(next as number)}
								slotProps={{ input: { "aria-label": variable.mnemonic } }}
							/>
							<Typography variant="body2" sx={{ minWidth: "3ch" }}>
								{value === undefined ? "-" : String(value)}
							</Typography>
						</FlexBox>
					) : isPushButtonBehavior(behavior) ? (
						<FormControlLabel
							control={
								// Same width as a Switch, so that the value lines up with the switches'.
								<Box
									sx={{ width: 58, display: "flex", justifyContent: "center" }}
								>
									<PushButtonControl
										ariaLabel={variable.mnemonic}
										pressed={value === !getInputRestValue(behavior)}
										onPress={() => changeValue(!getInputRestValue(behavior))}
										onRelease={() => changeValue(getInputRestValue(behavior))}
									/>
								</Box>
							}
							label={formatBooleanValue(value, dialect)}
						/>
					) : nativeType === "boolean" ? (
						variable.getDirection() === "OUT" ? (
							<Typography
								color={value === true ? "primary.main" : "text.primary"}
							>
								{formatBooleanValue(value, dialect)}
							</Typography>
						) : (
							<FormControlLabel
								control={
									// Checked = actuated position, which writes `false` on a normally
									// closed switch.
									<Switch
										checked={normallyClosed ? !value : !!value}
										onChange={(e) => {
											changeValue(
												normallyClosed ? !e.target.checked : e.target.checked,
											);
										}}
										inputProps={{ "aria-label": variable.mnemonic }}
									/>
								}
								label={formatBooleanValue(value, dialect)}
							/>
						)
					) : variable.getDirection() === "OUT" ? (
						<Typography>{value === undefined ? "-" : String(value)}</Typography>
					) : (
						<TextField
							size="small"
							type={nativeType === "number" ? "number" : "text"}
							slotProps={{ htmlInput: { "aria-label": variable.mnemonic } }}
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

/** Momentary button: working value while held (mouse or Space/Enter key), rest value on
 * release. */
function PushButtonControl({
	ariaLabel,
	pressed,
	onPress,
	onRelease,
}: {
	ariaLabel: string;
	pressed: boolean;
	onPress: () => void;
	onRelease: () => void;
}) {
	const held = useRef(false);
	const press = () => {
		if (held.current) return;
		held.current = true;
		onPress();
	};
	const release = () => {
		if (!held.current) return;
		held.current = false;
		onRelease();
	};
	const isActivationKey = (key: string) => key === " " || key === "Enter";

	return (
		<Button
			size="small"
			variant={pressed ? "contained" : "outlined"}
			aria-label={ariaLabel}
			aria-pressed={pressed}
			disableRipple
			onPointerDown={press}
			onPointerUp={release}
			onPointerLeave={release}
			onKeyDown={(e) => {
				if (!isActivationKey(e.key)) return;
				e.preventDefault();
				press();
			}}
			onKeyUp={(e) => {
				if (!isActivationKey(e.key)) return;
				e.preventDefault();
				release();
			}}
			onBlur={release}
			sx={{ minWidth: 0, width: 28, height: 28, p: 0, borderRadius: "50%" }}
		/>
	);
}
