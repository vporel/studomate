export type ArduinoDigitalPinMode = "INPUT_PULLUP" | "INPUT";

export interface ArduinoPinConfig {
	/** Electrical mode of a digital input pin. */
	mode?: ArduinoDigitalPinMode;
	/** Logical inversion: true when 0 V reads as `true` (typical wiring of an INPUT_PULLUP to GND). */
	inverted?: boolean;
}

export interface ArduinoUnoR3Target {
	modelId: "arduino-uno-r3";
	/** Per-pin configuration, keyed by pin address (e.g. `%PD2`). */
	pins?: Record<string, ArduinoPinConfig>;
}

/** Hardware chosen by the user for a project. Discriminated on `modelId`: extend the union to add a model. */
export type HardwareTarget = ArduinoUnoR3Target;

export type HardwareModelId = HardwareTarget["modelId"];
