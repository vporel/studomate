import { readFileSync } from "fs";
import { join } from "path";
import arduinoUnoR3 from "./uno-r3.descriptor";

describe("Arduino Uno R3 descriptor and the VM firmware", () => {
	it("declares the VM capacities the Uno firmware is built with", () => {
		const config = readFileSync(
			join(
				__dirname,
				"../../../firmwares/arduino/uno-r3/stdm_config.h",
			),
			"utf8",
		);
		const value = (name: string) =>
			Number(new RegExp(`#define ${name} (\\d+)`).exec(config)?.[1]);
		expect(arduinoUnoR3.limits.vm).toEqual({
			variableBytes: value("STDM_VM_MEM_BYTES"),
			maxStack: value("STDM_VM_MAX_STACK"),
			maxCallDepth: value("STDM_VM_MAX_CALL_DEPTH"),
		});
	});
});
