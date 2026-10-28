import type { RemoteIoDeviceFactory } from "../managers/hardware-link/remote-io-device";

/** Stands in for the device factory of a store that cannot link a board. */
const unavailableRemoteIoDevice: RemoteIoDeviceFactory = async () => {
	throw new Error(
		"No board can be linked: this project store has no hardware support",
	);
};

export default unavailableRemoteIoDevice;
