import type { SerialTransport } from "./transport";

/**
 * USB vendor ids of the boards offered in the port chooser and of the remembered ports: Arduino
 * SA, arduino.org, and the CH340 chip of the common clones.
 */
export const ARDUINO_USB_VENDOR_IDS = [0x2341, 0x2a03, 0x1a86];

const isArduinoVendor = (vendorId: number | undefined) =>
	vendorId !== undefined && ARDUINO_USB_VENDOR_IDS.includes(vendorId);

export function isWebSerialSupported(): boolean {
	return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * Port already authorised by the user for this site when there is one, otherwise the browser
 * chooser (needs a user gesture; rejects with `NotFoundError` if the user dismisses it).
 */
export async function acquireArduinoPort(): Promise<SerialPort> {
	const filters = ARDUINO_USB_VENDOR_IDS.map((usbVendorId) => ({
		usbVendorId,
	}));
	const known = (await navigator.serial.getPorts()).filter((port) =>
		isArduinoVendor(port.getInfo().usbVendorId),
	);
	if (known.length === 1) return known[0];
	return navigator.serial.requestPort({ filters });
}

export interface WebSerialTransportOptions {
	baudRate: number;
	/** Duration of the reset pulse (DTR/RTS low) that restarts the board. */
	resetPulseMs?: number;
	/** Wait after the pulse, before the bootloader accepts bytes: frames sent earlier arrive truncated. */
	bootDelayMs?: number;
}

/**
 * One character per byte. `TextDecoder("latin1")` is not usable: browsers map it to windows-1252,
 * which turns bytes 0x80 to 0x9F into other code points.
 */
function bytesToString(bytes: Uint8Array): string {
	let text = "";
	for (const byte of bytes) text += String.fromCharCode(byte);
	return text;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** `SerialTransport` over a Web Serial port. `open()` resets the board and resolves once it can be talked to. */
export default class WebSerialTransport implements SerialTransport {
	private readonly options: Required<WebSerialTransportOptions>;
	private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
	private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
	private readonly dataListeners = new Set<(chunk: string) => void>();
	private readonly closeListeners = new Set<() => void>();
	private closing = false;
	private readonly onPortDisconnect = () => this.notifyClosed();

	constructor(
		private readonly port: SerialPort,
		options: WebSerialTransportOptions,
	) {
		this.options = { resetPulseMs: 250, bootDelayMs: 400, ...options };
	}

	async open(): Promise<void> {
		this.closing = false;
		await this.port.open({ baudRate: this.options.baudRate });
		this.port.addEventListener("disconnect", this.onPortDisconnect);
		this.writer = this.port.writable!.getWriter();
		this.reader = this.port.readable!.getReader();
		void this.readLoop(this.reader);
		await this.port.setSignals({
			dataTerminalReady: false,
			requestToSend: false,
		});
		await sleep(this.options.resetPulseMs);
		await this.port.setSignals({
			dataTerminalReady: true,
			requestToSend: true,
		});
		await sleep(this.options.bootDelayMs);
	}

	async write(data: string): Promise<void> {
		if (!this.writer) throw new Error("Port is not open");
		await this.writer.write(
			Uint8Array.from(data, (char) => char.charCodeAt(0) & 0xff),
		);
	}

	onData(listener: (chunk: string) => void) {
		this.dataListeners.add(listener);
		return () => void this.dataListeners.delete(listener);
	}

	onClose(listener: () => void) {
		this.closeListeners.add(listener);
		return () => void this.closeListeners.delete(listener);
	}

	async close(): Promise<void> {
		this.closing = true;
		this.port.removeEventListener("disconnect", this.onPortDisconnect);
		const { reader, writer } = this;
		this.reader = null;
		this.writer = null;
		try {
			await reader?.cancel();
		} catch {
			// Already errored.
		}
		reader?.releaseLock();
		writer?.releaseLock();
		try {
			await this.port.close();
		} catch {
			// Already closed or unplugged.
		}
	}

	private async readLoop(reader: ReadableStreamDefaultReader<Uint8Array>) {
		try {
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				const text = bytesToString(value);
				for (const listener of this.dataListeners) listener(text);
			}
		} catch {
			// Fatal read error: the port is gone.
		}
		this.notifyClosed();
	}

	private notifyClosed() {
		if (this.closing) return;
		this.closing = true;
		for (const listener of this.closeListeners) listener();
	}
}
