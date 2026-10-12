import type {
	HardwareDeviceDescriptor,
	HardwarePin,
} from "./hardware-device.descriptor";

const PWM_DIGITAL_PINS = new Set([3, 5, 6, 9, 10, 11]);

const digitalPins: HardwarePin[] = Array.from({ length: 12 }, (_, i) => {
	const n = i + 2;
	return {
		address: `%PD${n}`,
		capabilities: [
			"digital-input",
			"digital-output",
			...(PWM_DIGITAL_PINS.has(n) ? (["pwm-output"] as const) : []),
		],
	};
});

const analogPins: HardwarePin[] = Array.from({ length: 6 }, (_, n) => ({
	address: `%PA${n}`,
	capabilities: ["analog-input", "digital-input", "digital-output"],
}));

const arduinoUnoR3: HardwareDeviceDescriptor = {
	modelId: "arduino-uno-r3",
	label: "Arduino Uno R3",
	channel: { kind: "web-serial", baudRate: 115200 },
	supportedVariableTypes: ["BOOL", "INT", "WORD", "DINT", "DWORD", "TIME"],
	pins: [
		{ address: "%PD0", capabilities: [], reservedFor: "uart" },
		{ address: "%PD1", capabilities: [], reservedFor: "uart" },
		...digitalPins,
		...analogPins,
	],
	analog: {
		inputRange: { min: 0, max: 1023 },
		outputRange: { min: 0, max: 255 },
	},
	limits: { ramBytes: 2048, programStorageBytes: 1024 },
};

export default arduinoUnoR3;
