import { parseIntelHex } from "@/hardware/arduino/flash/intel-hex";
import { SHIPPED_FIRMWARE_VERSION } from "@/hardware/arduino/remote-io/firmware-version";
import RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import WebSerialTransport, {
	acquireArduinoPort,
} from "@/hardware/arduino/remote-io/web-serial.transport";
import type { RemoteIoDeviceFactory } from "./remote-io-device";

export const ARDUINO_UNO_R3_FIRMWARE_URL = "/firmwares/arduino/uno-r3.hex";

/**
 * Device over the real serial port. Must be called from a user gesture: without an authorised
 * port, the browser chooser opens. The heartbeat worker is loaded lazily, since it is bundled
 * through `import.meta.url`.
 */
const createBrowserRemoteIoDevice: RemoteIoDeviceFactory = async (
	plan,
	descriptor,
) => {
	const port = await acquireArduinoPort();
	const { browserHeartbeat } =
		await import("@/hardware/heartbeat/browser-heartbeat");
	const transport = new WebSerialTransport(port, {
		baudRate: descriptor.channel.baudRate,
	});
	return {
		transport,
		createClient: () =>
			new RemoteIoClient({
				transport,
				plan,
				heartbeat: browserHeartbeat,
				minFirmwareVersion: SHIPPED_FIRMWARE_VERSION,
			}),
		loadFirmware: async () => {
			const response = await fetch(ARDUINO_UNO_R3_FIRMWARE_URL);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			return parseIntelHex(await response.text());
		},
	};
};

export default createBrowserRemoteIoDevice;
