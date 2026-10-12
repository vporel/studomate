import type {
	ArduinoPinConfig,
	ArduinoUnoR3Target,
} from "@/schemas/hardware/hardware-target.schema";

/** Applies to any digital input pin without an explicit configuration: push button wired between the pin and GND. */
export const DEFAULT_ARDUINO_INPUT_PIN_CONFIG: Required<ArduinoPinConfig> = {
	mode: "INPUT_PULLUP",
	inverted: true,
};

/** Configuration of a pin with the defaults filled in, field by field. */
export function resolveArduinoPinConfig(
	target: ArduinoUnoR3Target,
	address: string,
): Required<ArduinoPinConfig> {
	const explicit = target.pins?.[address];
	return {
		mode: explicit?.mode ?? DEFAULT_ARDUINO_INPUT_PIN_CONFIG.mode,
		inverted: explicit?.inverted ?? DEFAULT_ARDUINO_INPUT_PIN_CONFIG.inverted,
	};
}

/** New target where `patch` is merged into the configuration of `address`; other pins are untouched. */
export function withArduinoPinConfig(
	target: ArduinoUnoR3Target,
	address: string,
	patch: ArduinoPinConfig,
): ArduinoUnoR3Target {
	return {
		...target,
		pins: {
			...target.pins,
			[address]: { ...target.pins?.[address], ...patch },
		},
	};
}
