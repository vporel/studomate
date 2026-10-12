import { FrameDecoder, encodeFrame } from "@/hardware/arduino/remote-io/frame";
import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";
import type { HeartbeatScheduler } from "@/hardware/heartbeat/heartbeat-scheduler";

export interface FakeBoardOptions {
	/** Answers `PING`. When false the board behaves like a blank board or another sketch. */
	firmwarePresent?: boolean;
	protocol?: string;
	firmware?: string;
	inputPeriodMs?: number;
	/** Pins the board accepts in `CFG`. */
	knownPins?: string[];
	/** Raw bytes emitted right after `open()`, like a rebooting bootloader. */
	bootGarbage?: string;
	failOpen?: boolean;
}

/** In-memory board speaking the remote I/O protocol, used as a `SerialTransport`. */
export default class FakeRemoteIoBoard implements SerialTransport {
	readonly received: Array<{ command: string; args: string[] }> = [];
	opened = false;
	closed = false;
	private readonly decoder = new FrameDecoder();
	private dataListeners = new Set<(chunk: string) => void>();
	private closeListeners = new Set<() => void>();
	private readonly options: Required<FakeBoardOptions>;

	constructor(options: FakeBoardOptions = {}) {
		this.options = {
			firmwarePresent: true,
			protocol: "1.0",
			firmware: "1.0.0",
			inputPeriodMs: 20,
			knownPins: [
				...Array.from({ length: 12 }, (_, i) => String(i + 2)),
				...Array.from({ length: 6 }, (_, i) => `A${i}`),
			],
			bootGarbage: "",
			failOpen: false,
			...options,
		};
	}

	async open() {
		if (this.options.failOpen) throw new Error("port busy");
		this.opened = true;
		if (this.options.bootGarbage) {
			queueMicrotask(() => this.emit(this.options.bootGarbage));
		}
	}

	async write(data: string) {
		for (const frame of this.decoder.push(data)) {
			this.received.push(frame);
			this.answer(frame);
		}
	}

	onData(listener: (chunk: string) => void) {
		this.dataListeners.add(listener);
		return () => void this.dataListeners.delete(listener);
	}

	onClose(listener: () => void) {
		this.closeListeners.add(listener);
		return () => void this.closeListeners.delete(listener);
	}

	async close() {
		this.closed = true;
	}

	/** Pushes an input image as the firmware would, in several chunks when `split` is set. */
	emitInputs(values: Record<string, number>, split = false) {
		const line = encodeFrame(
			"IN",
			Object.entries(values).map(([pin, value]) => `${pin}=${value}`),
		);
		if (!split) return this.emit(line);
		const middle = Math.floor(line.length / 2);
		this.emit(line.slice(0, middle));
		this.emit(line.slice(middle));
	}

	emit(chunk: string) {
		for (const listener of this.dataListeners) listener(chunk);
	}

	unplug() {
		for (const listener of this.closeListeners) listener();
	}

	/** `OUT` frames received so far, as `{ pin: value }`. */
	outImages(): Array<Record<string, number>> {
		return this.received
			.filter((frame) => frame.command === "OUT")
			.map((frame) =>
				Object.fromEntries(
					frame.args.map((arg) => {
						const [pin, value] = arg.split("=");
						return [pin, Number(value)];
					}),
				),
			);
	}

	private answer(frame: { command: string; args: string[] }) {
		if (!this.options.firmwarePresent) return;
		if (frame.command === "PING") {
			this.emit(
				encodeFrame("PONG", [
					"STUDOMATE_REMOTE_IO",
					this.options.protocol,
					this.options.firmware,
					String(this.options.inputPeriodMs),
				]),
			);
		} else if (frame.command === "CFG") {
			const unknown = frame.args
				.map((arg) => arg.split(":")[0])
				.find((pin) => !this.options.knownPins.includes(pin));
			this.emit(unknown ? encodeFrame("ERR", ["PIN"]) : encodeFrame("CFG_OK"));
		}
	}
}

/** Heartbeat scheduler driven by hand: `tick()` fires the callback once. */
export function createManualHeartbeat() {
	const state = {
		tick: null as null | (() => void),
		intervalMs: 0,
		stopped: false,
	};
	const scheduler: HeartbeatScheduler = (tick, intervalMs) => {
		state.tick = tick;
		state.intervalMs = intervalMs;
		state.stopped = false;
		return () => {
			state.stopped = true;
		};
	};
	return { scheduler, state };
}
