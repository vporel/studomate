import { ZONE_TO_PIN_CAPABILITY } from "./hardware-device.descriptor";
import {
	getHardwareDevice,
	listHardwareDevices,
} from "./hardware-device.registry";

describe("hardware device registry", () => {
	it("returns the descriptor of a known model", () => {
		const descriptor = getHardwareDevice("arduino-uno-r3");
		expect(descriptor).toBeDefined();
		expect(descriptor?.modelId).toBe("arduino-uno-r3");
	});

	it.each(["unknown-model", "", "constructor", "__proto__", "toString"])(
		"returns undefined for the unknown model %j",
		(modelId) => {
			expect(getHardwareDevice(modelId)).toBeUndefined();
		},
	);

	it("lists every descriptor under its own modelId", () => {
		const descriptors = listHardwareDevices();
		expect(descriptors.length).toBeGreaterThan(0);
		for (const descriptor of descriptors) {
			expect(getHardwareDevice(descriptor.modelId)).toBe(descriptor);
		}
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
	it.each(listHardwareDevices().map((d) => [d.modelId, d] as const))(
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
