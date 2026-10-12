import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";
import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";

/** A board reachable through one serial port, which can be talked to or flashed. */
export interface RemoteIoDevice {
	transport: SerialTransport;
	/** A fresh client on `transport`; one client serves one link attempt. */
	createClient(): RemoteIoClient;
	/** Image of the firmware shipped with Studomate, as written to the flash. */
	loadFirmware(): Promise<Uint8Array>;
}

export type RemoteIoDeviceFactory = (
	plan: RemoteIoPlan,
	descriptor: HardwareDeviceDescriptor,
) => Promise<RemoteIoDevice>;
