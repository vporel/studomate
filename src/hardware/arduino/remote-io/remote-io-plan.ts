import type { ArduinoUnoR3Target } from "@/schemas/hardware/hardware-target.schema";
import type Variable from "@/schemas/variable/variable.schema";
import type {
	AnalogRange,
	HardwareDeviceDescriptor,
	PinCapability,
} from "@/hardware/hardware-device.descriptor";
import { ZONE_TO_PIN_CAPABILITY } from "@/hardware/hardware-device.descriptor";
import { resolveArduinoPinConfig } from "../pin-config";
import type { PinConfigEntry, PinMode } from "./messages";

export interface RemoteIoInput {
	variableId: string;
	pin: string;
	kind: "digital" | "analog";
	/** Digital only: the variable is true when the pin reads 0. */
	inverted: boolean;
}

export interface RemoteIoOutput {
	variableId: string;
	pin: string;
	kind: "digital" | "analog";
	range: AnalogRange;
}

/** What the link exchanges with the board for a project: pin configuration and variable mapping. */
export interface RemoteIoPlan {
	pins: PinConfigEntry[];
	inputs: RemoteIoInput[];
	outputs: RemoteIoOutput[];
}

/** Arduino name of a pin address: `%PD13` is `13`, `%PA0` is `A0`. */
export function arduinoPinName(address: string): string | null {
	const match = /^%P([DA])(\d{1,2})$/.exec(address);
	if (!match) return null;
	return match[1] === "A" ? `A${match[2]}` : match[2];
}

/**
 * Builds the plan from the variables carrying the address of a usable pin. Variables the board
 * cannot serve (unknown or reserved pin, missing capability, memory zone) are left out: the
 * analyser reports them. When several variables share a pin, the first one sets its mode.
 */
export default function buildRemoteIoPlan(
	target: ArduinoUnoR3Target,
	variables: Variable[],
	descriptor: HardwareDeviceDescriptor,
): RemoteIoPlan {
	const pinsByAddress = new Map(
		descriptor.pins.map((pin) => [pin.address, pin]),
	);
	const modes = new Map<string, PinMode>();
	const inputs: RemoteIoInput[] = [];
	const outputs: RemoteIoOutput[] = [];

	for (const variable of variables) {
		if (
			!variable.address ||
			variable.zone === "memory" ||
			variable.zone === "constant"
		)
			continue;
		const pin = pinsByAddress.get(variable.address);
		const pinName = arduinoPinName(variable.address);
		if (!pin || pin.reservedFor || !pinName) continue;
		const needed: PinCapability = ZONE_TO_PIN_CAPABILITY[variable.zone];
		if (!pin.capabilities.includes(needed)) continue;

		const config = resolveArduinoPinConfig(target, variable.address);
		switch (variable.zone) {
			case "logic-input":
				if (!modes.has(pinName)) {
					modes.set(pinName, config.mode === "INPUT_PULLUP" ? "IP" : "I");
				}
				inputs.push({
					variableId: variable.id,
					pin: pinName,
					kind: "digital",
					inverted: config.inverted,
				});
				break;
			case "analog-input":
				if (!modes.has(pinName)) modes.set(pinName, "A");
				inputs.push({
					variableId: variable.id,
					pin: pinName,
					kind: "analog",
					inverted: false,
				});
				break;
			case "logic-output":
				if (!modes.has(pinName)) modes.set(pinName, "O");
				outputs.push({
					variableId: variable.id,
					pin: pinName,
					kind: "digital",
					range: { min: 0, max: 1 },
				});
				break;
			case "analog-output":
				if (!modes.has(pinName)) modes.set(pinName, "P");
				outputs.push({
					variableId: variable.id,
					pin: pinName,
					kind: "analog",
					range: descriptor.analog.outputRange,
				});
				break;
		}
	}

	return {
		pins: [...modes].map(([pin, mode]) => ({ pin, mode })),
		inputs,
		outputs,
	};
}
