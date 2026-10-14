import type { HardwareModelId } from "@/schemas/hardware/hardware-target.schema";
import arduinoUnoR3 from "./arduino/uno-r3.descriptor";
import type { HardwareDeviceDescriptor } from "./hardware-device.descriptor";

const DESCRIPTORS: Record<HardwareModelId, HardwareDeviceDescriptor> = {
	"arduino-uno-r3": arduinoUnoR3,
};

/** `undefined` for a `modelId` this version of the application does not know. */
export function getHardwareDevice(
	modelId: string,
): HardwareDeviceDescriptor | undefined {
	return Object.hasOwn(DESCRIPTORS, modelId)
		? DESCRIPTORS[modelId as HardwareModelId]
		: undefined;
}

export function listHardwareDevices(): HardwareDeviceDescriptor[] {
	return Object.values(DESCRIPTORS);
}
