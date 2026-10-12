import type { HardwareModelId } from "@/schemas/hardware/hardware-target.schema";
import arduinoUnoR3 from "./arduino-uno-r3.descriptor";
import type { HardwareDeviceDescriptor } from "./hardware-device.descriptor";

const DESCRIPTORS: Record<HardwareModelId, HardwareDeviceDescriptor> = {
	"arduino-uno-r3": arduinoUnoR3,
};

export default class HardwareDeviceRegistry {
	/** `undefined` for a `modelId` this version of the application does not know. */
	static get(modelId: string): HardwareDeviceDescriptor | undefined {
		return Object.hasOwn(DESCRIPTORS, modelId)
			? DESCRIPTORS[modelId as HardwareModelId]
			: undefined;
	}

	static list(): HardwareDeviceDescriptor[] {
		return Object.values(DESCRIPTORS);
	}
}
