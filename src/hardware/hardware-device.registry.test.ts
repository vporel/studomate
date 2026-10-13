import { ZONE_TO_PIN_CAPABILITY } from "./hardware-device.descriptor";
import HardwareDeviceRegistry from "./hardware-device.registry";

describe("HardwareDeviceRegistry", () => {
	it("returns the descriptor of a known model", () => {
		expect(HardwareDeviceRegistry.get("arduino-uno-r3")?.label).toBe(
			"Arduino Uno R3",
		);
	});

	it.each(["unknown-model", "", "constructor", "__proto__", "toString"])(
		"returns undefined for the unknown model %j",
		(modelId) => {
			expect(HardwareDeviceRegistry.get(modelId)).toBeUndefined();
		},
	);

	it("lists every descriptor under its own modelId", () => {
		const descriptors = HardwareDeviceRegistry.list();
		expect(descriptors.length).toBeGreaterThan(0);
		for (const descriptor of descriptors) {
			expect(HardwareDeviceRegistry.get(descriptor.modelId)).toBe(descriptor);
		}
	});
});

describe("Arduino Uno R3 descriptor", () => {
	const uno = HardwareDeviceRegistry.get("arduino-uno-r3")!;
	const pin = (address: string) => uno.pins.find((p) => p.address === address);

	it("talks over Web Serial at 115200 bauds", () => {
		expect(uno.channel).toEqual({ kind: "web-serial", baudRate: 115200 });
	});

	it("supports the PLC types the VM can run, not REAL nor STRING", () => {
		expect(uno.supportedVariableTypes).toEqual([
			"BOOL",
			"INT",
			"WORD",
			"DINT",
			"DWORD",
			"TIME",
		]);
	});

	it("has no duplicate pin address", () => {
		const addresses = uno.pins.map((p) => p.address);
		expect(new Set(addresses).size).toBe(addresses.length);
	});

	it("exposes %PD0..%PD13 and %PA0..%PA5, nothing else", () => {
		const expected = [
			...Array.from({ length: 14 }, (_, n) => `%PD${n}`),
			...Array.from({ length: 6 }, (_, n) => `%PA${n}`),
		];
		expect(uno.pins.map((p) => p.address).sort()).toEqual(expected.sort());
	});

	it("reserves %PD0 and %PD1 for the UART, with no capability", () => {
		for (const address of ["%PD0", "%PD1"]) {
			expect(pin(address)).toEqual({
				address,
				capabilities: [],
				reservedFor: "uart",
			});
		}
	});

	it("gives %PD2..%PD13 digital input and output, and no analog input", () => {
		for (let n = 2; n <= 13; n++) {
			const capabilities = pin(`%PD${n}`)!.capabilities;
			expect(capabilities).toEqual(
				expect.arrayContaining(["digital-input", "digital-output"]),
			);
			expect(capabilities).not.toContain("analog-input");
			expect(pin(`%PD${n}`)!.reservedFor).toBeUndefined();
		}
	});

	it("gives PWM output only to D3, D5, D6, D9, D10 and D11", () => {
		const pwm = uno.pins
			.filter((p) => p.capabilities.includes("pwm-output"))
			.map((p) => p.address);
		expect(pwm.sort()).toEqual(
			["%PD3", "%PD5", "%PD6", "%PD9", "%PD10", "%PD11"].sort(),
		);
	});

	it("gives %PA0..%PA5 analog input plus digital input and output, without PWM", () => {
		for (let n = 0; n <= 5; n++) {
			const capabilities = pin(`%PA${n}`)!.capabilities;
			expect(capabilities).toEqual(
				expect.arrayContaining([
					"analog-input",
					"digital-input",
					"digital-output",
				]),
			);
			expect(capabilities).not.toContain("pwm-output");
		}
	});

	it("declares the RAM and the EEPROM available to the program", () => {
		expect(uno.limits).toEqual({
			ramBytes: 2048,
			programStorageBytes: 1024,
			vm: { variableBytes: 512, maxStack: 16, maxCallDepth: 4 },
		});
	});

	it("declares the raw analog ranges: analogRead 0..1023, analogWrite 0..255", () => {
		expect(uno.analog).toEqual({
			inputRange: { min: 0, max: 1023 },
			outputRange: { min: 0, max: 255 },
		});
	});
});

describe("ZONE_TO_PIN_CAPABILITY", () => {
	it("maps each I/O zone to the capability it needs", () => {
		expect(ZONE_TO_PIN_CAPABILITY).toEqual({
			"logic-input": "digital-input",
			"logic-output": "digital-output",
			"analog-input": "analog-input",
			"analog-output": "pwm-output",
		});
	});
});

describe("every descriptor", () => {
	it.each(HardwareDeviceRegistry.list().map((d) => [d.modelId, d] as const))(
		"%s has non-empty, ordered analog ranges and positive limits",
		(_modelId, descriptor) => {
			for (const range of Object.values(descriptor.analog)) {
				expect(range.min).toBeLessThan(range.max);
			}
			expect(descriptor.limits.ramBytes).toBeGreaterThan(0);
			expect(descriptor.limits.programStorageBytes).toBeGreaterThan(0);
			expect(descriptor.limits.vm.variableBytes).toBeGreaterThan(0);
			expect(descriptor.limits.vm.maxStack).toBeGreaterThan(0);
			expect(descriptor.limits.vm.maxCallDepth).toBeGreaterThan(0);
		},
	);
});
