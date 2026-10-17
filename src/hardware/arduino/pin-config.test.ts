import type { ArduinoUnoR3Target } from "@/schemas/hardware/hardware-target.schema";
import {
	DEFAULT_ARDUINO_INPUT_PIN_CONFIG,
	resolveArduinoPinConfig,
	withArduinoPinConfig,
} from "./pin-config";

const bare: ArduinoUnoR3Target = { modelId: "arduino-uno-r3" };

describe("resolveArduinoPinConfig", () => {
	it("falls back to INPUT_PULLUP and inverted when nothing is configured", () => {
		expect(resolveArduinoPinConfig(bare, "%PD2")).toEqual({
			mode: "INPUT_PULLUP",
			inverted: true,
		});
		expect(DEFAULT_ARDUINO_INPUT_PIN_CONFIG).toEqual({
			mode: "INPUT_PULLUP",
			inverted: true,
		});
	});

	it("returns an explicit configuration as is", () => {
		const target: ArduinoUnoR3Target = {
			...bare,
			pins: { "%PD2": { mode: "INPUT", inverted: false } },
		};
		expect(resolveArduinoPinConfig(target, "%PD2")).toEqual({
			mode: "INPUT",
			inverted: false,
		});
	});

	it("fills in each missing field independently", () => {
		const target: ArduinoUnoR3Target = {
			...bare,
			pins: { "%PD2": { mode: "INPUT" }, "%PD3": { inverted: false } },
		};
		expect(resolveArduinoPinConfig(target, "%PD2")).toEqual({
			mode: "INPUT",
			inverted: true,
		});
		expect(resolveArduinoPinConfig(target, "%PD3")).toEqual({
			mode: "INPUT_PULLUP",
			inverted: false,
		});
	});

	it("does not read the configuration of another pin", () => {
		const target: ArduinoUnoR3Target = {
			...bare,
			pins: { "%PD2": { mode: "INPUT", inverted: false } },
		};
		expect(resolveArduinoPinConfig(target, "%PD3")).toEqual(
			DEFAULT_ARDUINO_INPUT_PIN_CONFIG,
		);
	});
});

describe("withArduinoPinConfig", () => {
	it("creates the pin entry when the target has no pins", () => {
		expect(withArduinoPinConfig(bare, "%PD2", { mode: "INPUT" })).toEqual({
			modelId: "arduino-uno-r3",
			pins: { "%PD2": { mode: "INPUT" } },
		});
	});

	it("merges the patch into the existing entry, keeping the other field", () => {
		const target: ArduinoUnoR3Target = {
			...bare,
			pins: { "%PD2": { mode: "INPUT", inverted: false } },
		};
		expect(withArduinoPinConfig(target, "%PD2", { inverted: true })).toEqual({
			modelId: "arduino-uno-r3",
			pins: { "%PD2": { mode: "INPUT", inverted: true } },
		});
	});

	it("leaves the other pins untouched", () => {
		const target: ArduinoUnoR3Target = {
			...bare,
			pins: { "%PD3": { inverted: false } },
		};
		expect(
			withArduinoPinConfig(target, "%PD2", { mode: "INPUT" }).pins,
		).toEqual({ "%PD3": { inverted: false }, "%PD2": { mode: "INPUT" } });
	});

	it("does not mutate its input", () => {
		const target: ArduinoUnoR3Target = {
			...bare,
			pins: { "%PD2": { mode: "INPUT" } },
		};
		const snapshot = JSON.parse(JSON.stringify(target));
		withArduinoPinConfig(target, "%PD2", { inverted: false });
		withArduinoPinConfig(target, "%PD9", { inverted: false });
		expect(target).toEqual(snapshot);
	});
});
