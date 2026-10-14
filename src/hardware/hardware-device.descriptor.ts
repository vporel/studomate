import type { HardwareModelId } from "@/schemas/hardware/hardware-target.schema";
import type {
	VariableType,
	VariableZone,
} from "@/schemas/variable/variable.schema";

export type PinCapability =
	"digital-input" | "digital-output" | "analog-input" | "pwm-output";

/** Pin capability a variable needs, by zone. Memory variables and constants never use a pin. */
export const ZONE_TO_PIN_CAPABILITY: Record<
	Exclude<VariableZone, "memory" | "constant">,
	PinCapability
> = {
	"logic-input": "digital-input",
	"logic-output": "digital-output",
	"analog-input": "analog-input",
	"analog-output": "pwm-output",
};

export interface HardwarePin {
	/** Address of the physical pin (e.g. `%PD2`). */
	address: string;
	capabilities: PinCapability[];
	/** Set when the pin is used by the board itself and cannot carry a variable. */
	reservedFor?: "uart";
}

export interface AnalogRange {
	min: number;
	max: number;
}

/** Inclusive range of pin numbers of the bytecode I/O table. */
export interface PinNumberRange {
	min: number;
	max: number;
}

/** Static description of a hardware model: never persisted in a project. */
export interface HardwareDeviceDescriptor {
	modelId: HardwareModelId;
	label: string;
	channel: { kind: "web-serial"; baudRate: number };
	supportedVariableTypes: VariableType[];
	pins: HardwarePin[];
	/**
	 * Raw value ranges exchanged with the pins: an `analog-input` variable receives a value of
	 * `inputRange`, an `analog-output` variable is saturated to `outputRange`. Same for every pin.
	 */
	analog: { inputRange: AnalogRange; outputRange: AnalogRange };
	limits: {
		ramBytes: number;
		/** Non-volatile space available to the uploaded program image. */
		programStorageBytes: number;
		/** Capacities of the bytecode VM the shipped firmware is built with. */
		vm: {
			variableBytes: number;
			maxStack: number;
			maxCallDepth: number;
			/** Pin numbers the VM's I/O table accepts. */
			pinRange: PinNumberRange;
		};
	};
}
