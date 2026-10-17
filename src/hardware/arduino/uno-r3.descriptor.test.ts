import { readFileSync } from "fs";
import { join } from "path";
import { pinNumber } from "@/bytecode/arduino-io-bindings";
import arduinoUnoR3 from "./uno-r3.descriptor";

describe("Arduino Uno R3 descriptor and the VM firmware", () => {
	it("declares the VM capacities the Uno firmware is built with", () => {
		const config = readFileSync(
			join(__dirname, "../../../firmwares/arduino/uno-r3/stdm_config.h"),
			"utf8",
		);
		const value = (name: string) =>
			Number(new RegExp(`#define ${name} (\\d+)`).exec(config)?.[1]);
		expect(arduinoUnoR3.limits.vm).toMatchObject({
			variableBytes: value("STDM_VM_MEM_BYTES"),
			maxStack: value("STDM_VM_MAX_STACK"),
			maxCallDepth: value("STDM_VM_MAX_CALL_DEPTH"),
		});
	});

	it("declares the pin range the VM loader accepts", () => {
		const source = readFileSync(
			join(__dirname, "../../../firmwares/vm/stdm_vm.c"),
			"utf8",
		);
		const match = /pin < (\d+) \|\| pin > (\d+)/.exec(source);
		expect(arduinoUnoR3.limits.vm.pinRange).toEqual({
			min: Number(match?.[1]),
			max: Number(match?.[2]),
		});
	});

	it("maps every usable pin to a pin number inside the VM pin range", () => {
		const { min, max } = arduinoUnoR3.limits.vm.pinRange;
		const usable = arduinoUnoR3.pins.filter((pin) => !pin.reservedFor);
		expect(usable.length).toBeGreaterThan(0);
		for (const pin of usable) {
			const match = /^%P([DA])(\d+)$/.exec(pin.address);
			expect(match).not.toBeNull();
			const name = match![1] === "A" ? `A${match![2]}` : match![2];
			const number = pinNumber(name);
			expect(number).toBeGreaterThanOrEqual(min);
			expect(number).toBeLessThanOrEqual(max);
		}
	});

	it("leaves the serial pins out of the VM pin range", () => {
		const { min } = arduinoUnoR3.limits.vm.pinRange;
		expect(min).toBeGreaterThan(1);
	});
});

describe("Arduino Uno R3 pin table invariants", () => {
	const { pins } = arduinoUnoR3;

	it("has no duplicate pin address", () => {
		const addresses = pins.map((p) => p.address);
		expect(new Set(addresses).size).toBe(addresses.length);
	});

	it("gives PWM output only to pins that are also digital outputs", () => {
		for (const pin of pins.filter((p) =>
			p.capabilities.includes("pwm-output"),
		)) {
			expect(pin.capabilities).toContain("digital-output");
		}
	});

	it("gives analog input only to pins that are also digital inputs and outputs", () => {
		for (const pin of pins.filter((p) =>
			p.capabilities.includes("analog-input"),
		)) {
			expect(pin.capabilities).toEqual(
				expect.arrayContaining(["digital-input", "digital-output"]),
			);
		}
	});

	it("leaves reserved pins without capability and gives every other pin at least one", () => {
		for (const pin of pins) {
			if (pin.reservedFor) expect(pin.capabilities).toEqual([]);
			else expect(pin.capabilities.length).toBeGreaterThan(0);
		}
	});
});
