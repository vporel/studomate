import { FrameDecoder, encodeFrame } from "@/hardware/arduino/remote-io/frame";
import verifyBytecode from "@/bytecode/bytecode.verifier";
import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";
import type { HeartbeatScheduler } from "@/lib/heartbeat/heartbeat-scheduler";

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
	/** EEPROM bytes available to a program image. */
	programCapacity?: number;
	/** Number of `PROG_CHUNK` frames swallowed before the board answers (lost frames). */
	dropChunks?: number;
	/** Number of `PROG_ACK` answers swallowed after the chunk was stored (lost answers). */
	dropAcks?: number;
	/** The board answers `ERR <code>` to `PROG_END` instead of verifying the image. */
	rejectProgramEnd?: string;
}

/** In-memory board speaking the remote I/O protocol, used as a `SerialTransport`. */
export default class FakeRemoteIoBoard implements SerialTransport {
	readonly received: Array<{ command: string; args: string[] }> = [];
	/** Program stored by a completed transfer, `null` until then. */
	program: Uint8Array | null = null;
	/** True while the stored program runs, until the next `CFG` puts the board back in remote I/O. */
	autonomous = false;
	programming = false;
	/** True after `PROG_STOP`, until the next `CFG`, `PROG_RUN` or transfer. */
	stopped = false;
	/** Fault code the board reports in `STATUS` (0: none). */
	fault = 0;
	/** Variables written with `SET`, by index. */
	written = new Map<number, number>();
	/** Variables forced with `FORCE`, by index. */
	forced = new Map<number, number>();
	/** Number of variables of the program, for the index check. */
	variableCount = 8;
	/** True between `WATCH 1` and `WATCH 0`. */
	watching = false;
	private incoming: number[] = [];
	private expectedSeq = 0;
	private programSize = 0;
	private dropChunks = 0;
	private dropAcks = 0;
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
			programCapacity: 1024,
			dropChunks: 0,
			dropAcks: 0,
			rejectProgramEnd: "",
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

	/** Sends an image of the variable memory in `TEL` frames of 16 bytes, as the firmware does. */
	emitTelemetry(
		memory: ArrayLike<number>,
		{ cycle = 1, tag = 0 }: { cycle?: number; tag?: number } = {},
	) {
		for (let offset = 0; offset < memory.length; offset += 16) {
			const bytes = Array.from(
				{ length: Math.min(16, memory.length - offset) },
				(_, i) => memory[offset + i],
			);
			this.emit(
				encodeFrame("TEL", [
					tag.toString(16).toUpperCase().padStart(4, "0"),
					String(cycle),
					String(offset),
					bytes
						.map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
						.join(""),
				]),
			);
		}
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

	private answerProgram(frame: { command: string; args: string[] }) {
		const error = (code: string) => this.emit(encodeFrame("ERR", [code]));
		if (frame.command === "PROG_BEGIN") {
			const size = Number(frame.args[0]);
			if (!(size > 0) || size > this.options.programCapacity)
				return error("PROG_SIZE");
			this.programming = true;
			this.autonomous = false;
			this.stopped = false;
			this.incoming = [];
			this.expectedSeq = 0;
			this.programSize = size;
			this.dropChunks = this.options.dropChunks;
			this.dropAcks = this.options.dropAcks;
			this.emit(encodeFrame("PROG_READY"));
		} else if (frame.command === "PROG_CHUNK") {
			if (!this.programming) return error("PROG_STATE");
			if (this.dropChunks > 0) {
				this.dropChunks--;
				return;
			}
			const seq = Number(frame.args[0]);
			if (seq === this.expectedSeq - 1) {
				this.emit(encodeFrame("PROG_ACK", [String(seq)]));
				return;
			}
			if (seq !== this.expectedSeq) return error("PROG_SEQ");
			const hex = frame.args[1] ?? "";
			for (let i = 0; i < hex.length; i += 2) {
				this.incoming.push(Number.parseInt(hex.slice(i, i + 2), 16));
			}
			this.expectedSeq++;
			if (this.dropAcks > 0) {
				this.dropAcks--;
				return;
			}
			this.emit(encodeFrame("PROG_ACK", [String(seq)]));
		} else if (frame.command === "PROG_RUN") {
			if (!this.program) return error("PROG_INVALID");
			this.autonomous = true;
			this.stopped = false;
			this.programming = false;
			const id = new DataView(this.program.buffer).getUint32(22, true);
			this.emit(
				encodeFrame("PROG_OK", [
					id.toString(16).toUpperCase().padStart(8, "0"),
				]),
			);
		} else if (frame.command === "PROG_STOP") {
			this.autonomous = false;
			this.stopped = true;
			this.programming = false;
			this.watching = false;
			this.emit(encodeFrame("PROG_STOPPED"));
		} else if (frame.command === "PROG_END") {
			if (!this.programming) return error("PROG_STATE");
			if (this.options.rejectProgramEnd)
				return error(this.options.rejectProgramEnd);
			const image = Uint8Array.from(this.incoming);
			if (
				image.length !== this.programSize ||
				!verifyBytecode(image, this.options.programCapacity).valid
			) {
				return error("PROG_INVALID");
			}
			this.program = image;
			this.programming = false;
			this.autonomous = true;
			const id = new DataView(image.buffer).getUint32(22, true);
			this.emit(
				encodeFrame("PROG_OK", [
					id.toString(16).toUpperCase().padStart(8, "0"),
				]),
			);
		}
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
		} else if (frame.command === "STATUS") {
			const id = this.program
				? new DataView(this.program.buffer).getUint32(22, true)
				: 0;
			this.emit(
				encodeFrame("STATUS", [
					this.fault > 0
						? "2"
						: this.autonomous
							? "1"
							: this.stopped
								? "3"
								: "0",
					String(this.fault),
					id.toString(16).toUpperCase().padStart(8, "0"),
				]),
			);
		} else if (["SET", "FORCE", "UNFORCE"].includes(frame.command)) {
			if (!this.autonomous)
				return this.emit(encodeFrame("ERR", ["FORCE_STATE"]));
			const target = frame.args[0];
			const index = Number(target);
			if (frame.command === "UNFORCE" && target === "ALL") {
				this.forced.clear();
			} else if (!(index >= 0 && index < this.variableCount)) {
				return this.emit(encodeFrame("ERR", ["FORCE_INDEX"]));
			} else if (frame.command === "UNFORCE") {
				this.forced.delete(index);
			} else if (frame.command === "FORCE") {
				this.forced.set(index, Number(frame.args[1]));
			} else {
				this.written.set(index, Number(frame.args[1]));
			}
			this.emit(encodeFrame(frame.command === "SET" ? "SET_OK" : "FORCE_OK"));
		} else if (frame.command === "WATCH") {
			this.watching = frame.args[0] === "1";
			this.emit(encodeFrame("WATCH_OK"));
		} else if (frame.command.startsWith("PROG_")) {
			this.answerProgram(frame);
		} else if (frame.command === "CFG") {
			this.autonomous = false;
			this.programming = false;
			this.stopped = false;
			this.watching = false;
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
