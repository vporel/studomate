import type { SerialTransport } from "./transport";

/** USB vendor id of Arduino SA, used to filter the port chooser and the remembered ports. */
export const ARDUINO_USB_VENDOR_ID = 0x2341;

export function isWebSerialSupported(): boolean {
	return typeof navigator !== "undefined" && "serial" in navigator;
}

/**
 * Port already authorised by the user for this site when there is one, otherwise the browser
 * chooser (needs a user gesture; rejects with `NotFoundError` if the user dismisses it).
 */
export async function acquireArduinoPort(): Promise<SerialPort> {
	const filters = [{ usbVendorId: ARDUINO_USB_VENDOR_ID }];
	const known = (await navigator.serial.getPorts()).filter(
		(port) => port.getInfo().usbVendorId === ARDUINO_USB_VENDOR_ID,
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
		await this.writer.write(new TextEncoder().encode(data));
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
		const decoder = new TextDecoder("latin1");
		try {
			for (;;) {
				const { value, done } = await reader.read();
				if (done) break;
				const text = decoder.decode(value, { stream: true });
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
