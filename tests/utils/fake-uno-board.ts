import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";
import FakeOptiboot, { type FakeOptibootOptions } from "./fake-optiboot";
import FakeRemoteIoBoard, {
	type FakeBoardOptions,
} from "./fake-remote-io-board";

/**
 * Uno with its bootloader and an optional application: STK500 traffic (after a sync request)
 * reaches the bootloader, anything else the application. Leaving programming mode starts a
 * freshly flashed application.
 */
export default class FakeUnoBoard implements SerialTransport {
	readonly bootloader: FakeOptiboot;
	app: FakeRemoteIoBoard | null;
	opened = false;
	closed = false;
	private stkSession = false;
	private listeners = new Set<(chunk: string) => void>();
	private closeListeners = new Set<() => void>();

	constructor(
		/** `null`: blank board. */
		app: FakeBoardOptions | null,
		private readonly flashedApp: FakeBoardOptions = {},
		bootloader: FakeOptibootOptions = {},
	) {
		this.bootloader = new FakeOptiboot(bootloader);
		this.bootloader.onData((chunk) => this.dispatch(chunk));
		this.app = app ? this.createApp(app) : null;
	}

	async open() {
		this.opened = true;
		this.closed = false;
		this.stkSession = false;
		await this.bootloader.open();
	}

	async close() {
		this.closed = true;
		await this.bootloader.close();
	}

	async write(data: string) {
		if (data.charCodeAt(0) === 0x30 && data.length === 2)
			this.stkSession = true;
		if (this.stkSession) {
			const wasLeft = this.bootloader.left;
			await this.bootloader.write(data);
			if (!wasLeft && this.bootloader.left) {
				this.app = this.createApp(this.flashedApp);
			}
			return;
		}
		await this.app?.write(data);
	}

	onData(listener: (chunk: string) => void) {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	onClose(listener: () => void) {
		this.closeListeners.add(listener);
		return () => void this.closeListeners.delete(listener);
	}

	unplug() {
		for (const listener of this.closeListeners) listener();
	}

	private createApp(options: FakeBoardOptions) {
		const app = new FakeRemoteIoBoard(options);
		app.onData((chunk) => this.dispatch(chunk));
		return app;
	}

	private dispatch(chunk: string) {
		for (const listener of this.listeners) listener(chunk);
	}
}
