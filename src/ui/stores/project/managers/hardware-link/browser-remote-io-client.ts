import { acquireArduinoPort } from "@/hardware/arduino/remote-io/web-serial.transport";
import WebSerialTransport from "@/hardware/arduino/remote-io/web-serial.transport";
import RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";

export type RemoteIoClientFactory = (
	plan: RemoteIoPlan,
	descriptor: HardwareDeviceDescriptor,
) => Promise<RemoteIoClient>;

/**
 * Client over the real serial port. Must be called from a user gesture: without an authorised
 * port, the browser chooser opens. The heartbeat worker is loaded lazily, since it is bundled
 * through `import.meta.url`.
 */
const createBrowserRemoteIoClient: RemoteIoClientFactory = async (
	plan,
	descriptor,
) => {
	const port = await acquireArduinoPort();
	const { browserHeartbeat } =
		await import("@/hardware/heartbeat/browser-heartbeat");
	return new RemoteIoClient({
		transport: new WebSerialTransport(port, {
			baudRate: descriptor.channel.baudRate,
		}),
		plan,
		heartbeat: browserHeartbeat,
	});
};

export default createBrowserRemoteIoClient;
