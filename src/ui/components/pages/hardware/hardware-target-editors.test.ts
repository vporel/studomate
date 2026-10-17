import ArduinoUnoR3Editor from "./arduino/ArduinoUnoR3Editor";
import getHardwareTargetEditor from "./hardware-target-editors";

describe("getHardwareTargetEditor", () => {
	it("returns the editor of a known model", () => {
		expect(getHardwareTargetEditor("arduino-uno-r3")).toBe(ArduinoUnoR3Editor);
	});

	it("returns undefined for an unknown model, including inherited keys", () => {
		expect(getHardwareTargetEditor("raspberry-pi")).toBeUndefined();
		expect(getHardwareTargetEditor("toString")).toBeUndefined();
	});
});
