"use client";

import {
	resolveArduinoPinConfig,
	withArduinoPinConfig,
} from "@/hardware/arduino/pin-config";
import type {
	ArduinoDigitalPinMode,
	ArduinoPinConfig,
	ArduinoUnoR3Target,
} from "@/schemas/hardware/hardware-target.schema";
import { useT } from "@/ui/i18n/useT";
import {
	Checkbox,
	MenuItem,
	TableCell,
	TextField,
	Typography,
} from "@mui/material";
import {
	HardwarePinCellsProps,
	HardwareTargetEditor,
	pinLabel,
	whiteFieldSx,
} from "../hardware-target-editor";

const PIN_MODES: ArduinoDigitalPinMode[] = ["INPUT_PULLUP", "INPUT"];

const Intro = () => {
	const t = useT("pages.hardware.arduinoUnoR3");
	return (
		<>
			<Typography color="text.secondary" sx={{ mb: 1 }}>
				{t("intro")}
			</Typography>
			<Typography color="text.secondary" sx={{ mb: 2 }}>
				{t("wiringHelp")}
			</Typography>
		</>
	);
};

const Headers = () => {
	const t = useT("pages.hardware.arduinoUnoR3.columns");
	return (
		<>
			<TableCell>{t("mode")}</TableCell>
			<TableCell>{t("inverted")}</TableCell>
		</>
	);
};

const PinCells = ({
	target,
	pin,
	boundVariables,
	designing,
	onChange,
}: HardwarePinCellsProps<ArduinoUnoR3Target>) => {
	const t = useT("pages.hardware.arduinoUnoR3");
	const isDigitalInput = boundVariables.some(
		(variable) => variable.zone === "logic-input",
	);
	if (!isDigitalInput) {
		return (
			<>
				<TableCell />
				<TableCell />
			</>
		);
	}
	const config = resolveArduinoPinConfig(target, pin.address);
	const update = (patch: ArduinoPinConfig) =>
		onChange(withArduinoPinConfig(target, pin.address, patch));
	return (
		<>
			<TableCell>
				<TextField
					select
					size="small"
					value={config.mode}
					disabled={!designing}
					onChange={(e) =>
						update({ mode: e.target.value as ArduinoDigitalPinMode })
					}
					slotProps={{
						htmlInput: {
							"aria-label": t("pinModeAria", { pin: pinLabel(pin.address) }),
						},
					}}
					sx={{ minWidth: 200, ...whiteFieldSx }}
				>
					{PIN_MODES.map((mode) => (
						<MenuItem key={mode} value={mode}>
							{t(`pinModes.${mode}`)}
						</MenuItem>
					))}
				</TextField>
			</TableCell>
			<TableCell>
				<Checkbox
					checked={config.inverted}
					disabled={!designing}
					onChange={(e) => update({ inverted: e.target.checked })}
					slotProps={{
						input: {
							"aria-label": t("pinInvertedAria", {
								pin: pinLabel(pin.address),
							}),
						},
					}}
				/>
			</TableCell>
		</>
	);
};

const ArduinoUnoR3Editor: HardwareTargetEditor<ArduinoUnoR3Target> = {
	Intro,
	Headers,
	PinCells,
};

export default ArduinoUnoR3Editor;
