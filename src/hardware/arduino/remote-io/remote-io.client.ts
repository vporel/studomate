import {
	decodeDeviceMessage,
	encodeConfig,
	encodeForce,
	encodeOutputs,
	encodePing,
	encodeProgramBegin,
	encodeProgramChunk,
	encodeProgramEnd,
	encodeProgramRun,
	encodeProgramStop,
	encodeSetVariable,
	encodeStatusRequest,
	encodeUnforce,
	encodeWatch,
	PROGRAM_CHUNK_BYTES,
	PROTOCOL_MAJOR_VERSION,
	type DeviceMessage,
	type PinValue,
} from "./messages";
import { FrameDecoder } from "./frame";
import { isFirmwareOutdated } from "./firmware-version";
import type { RemoteIoPlan } from "./remote-io-plan";
import type { HeartbeatScheduler } from "@/hardware/heartbeat/heartbeat-scheduler";
import TelemetryAssembler, {
	type TelemetrySnapshot,
} from "./telemetry-assembler";
import type { SerialTransport } from "./transport";

export type RemoteIoState = "disconnected" | "connecting" | "linked";

/** Failures of a program transfer. */
export type RemoteIoUploadErrorCode =
	"upload-rejected" | "upload-timeout" | "upload-mismatch";

export function isRemoteIoUploadError(
	code: string,
): code is RemoteIoUploadErrorCode {
	return (
		code === "upload-rejected" ||
		code === "upload-timeout" ||
		code === "upload-mismatch"
	);
}

export type RemoteIoErrorCode =
	/** No valid `PONG` within the handshake window: blank board or another program. */
	| "handshake-timeout"
	/** The firmware speaks another major protocol version. */
	| "protocol-mismatch"
	/** The firmware is older than `minFirmwareVersion`. */
	| "firmware-outdated"
	/** The board answered `ERR` to the pin configuration. */
	| "config-rejected"
	/** The board refused the program transfer (`ERR` code in the detail). */
	| "upload-rejected"
	/** The board stopped answering during the program transfer. */
	| "upload-timeout"
	/** The board stored a program whose identifier differs from the one sent. */
	| "upload-mismatch"
	/** The port could not be opened, written to, or was lost. */
	| "transport"
	| "cancelled";

export class RemoteIoError extends Error {
	constructor(
		readonly code: RemoteIoErrorCode,
		readonly detail?: string,
	) {
		super(detail ? `${code}: ${detail}` : code);
	}
}

export interface RemoteIoFirmwareInfo {
	protocol: string;
	firmware: string;
	inputPeriodMs: number;
}

export interface RemoteIoStatus {
	state: "remote-io" | "running" | "fault" | "stopped";
	/** 0 when there is no fault. */
	fault: number;
	/** Identifier of the program image stored in the board, 0 when there is none. */
	imageId: number;
}

export interface RemoteIoWatchOptions {
	/** Bytes of variable memory of the program, as the layout of its image gives them. */
	memorySize: number;
	/** Identifier of the program image the memory layout belongs to. */
	imageId: number;
	/** A complete image of the variable memory, about every 50 ms. */
	onSnapshot: (snapshot: TelemetrySnapshot) => void;
	/** The board runs another program than `imageId`: its memory cannot be read. Called once. */
	onProgramMismatch: () => void;
}

export type RemoteIoInputValues = Map<string, boolean | number>;

export interface RemoteIoClientOptions {
	transport: SerialTransport;
	plan: RemoteIoPlan;
	heartbeat: HeartbeatScheduler;
	/** Interval between `OUT` frames; must stay under the firmware watchdog divided by three. */
	heartbeatIntervalMs?: number;
	/** Oldest firmware version accepted; unset accepts any version of the right protocol. */
	minFirmwareVersion?: string;
	handshakeTimeoutMs?: number;
	pingIntervalMs?: number;
	configTimeoutMs?: number;
	/** Wait for the acknowledgement of one program frame (writing a chunk to the EEPROM takes ~160 ms). */
	uploadAckTimeoutMs?: number;
	uploadAttempts?: number;
}

const DEFAULTS = {
	minFirmwareVersion: "",
	heartbeatIntervalMs: 150,
	handshakeTimeoutMs: 3000,
	pingIntervalMs: 250,
	configTimeoutMs: 1000,
	uploadAckTimeoutMs: 1500,
	uploadAttempts: 3,
};

/**
 * Remote I/O link: handshake, pin configuration, input images in, output images out, and the
 * safe fallback (all outputs at 0) of the firmware watchdog contract.
 */
export default class RemoteIoClient {
	private readonly options: Required<RemoteIoClientOptions>;
	private plan: RemoteIoPlan;
	private reconfiguring = false;
	private uploading = false;
	/** Tail of the queue of request/response exchanges: one at a time, as they share one listener. */
	private exchanges: Promise<unknown> = Promise.resolve();
	private watch: {
		assembler: TelemetryAssembler;
		tag: number;
		options: RemoteIoWatchOptions;
		mismatchReported: boolean;
	} | null = null;
	/** False while the board runs a program of its own: it then ignores `OUT` and sends no `IN`. */
	private remoteIoActive = true;
	private readonly decoder = new FrameDecoder();
	private state: RemoteIoState = "disconnected";
	private messageListener: ((message: DeviceMessage) => void) | null = null;
	private unsubscribers: Array<() => void> = [];
	private stopHeartbeat: (() => void) | null = null;
	private readonly outputValues = new Map<string, number>();
	private inputsListener: ((values: RemoteIoInputValues) => void) | null = null;
	private stateListener: ((state: RemoteIoState) => void) | null = null;
	private lostListener: ((error: RemoteIoError) => void) | null = null;
	private connectAbort: ((error: RemoteIoError) => void) | null = null;

	constructor(options: RemoteIoClientOptions) {
		this.options = { ...DEFAULTS, ...options };
		this.plan = options.plan;
		this.resetOutputs();
	}

	getState(): RemoteIoState {
		return this.state;
	}

	/** Called with each input image, already converted to variable values (inversion applied). */
	onInputs(listener: (values: RemoteIoInputValues) => void): void {
		this.inputsListener = listener;
	}

	onStateChange(listener: (state: RemoteIoState) => void): void {
		this.stateListener = listener;
	}

	/** Called when a linked board stops answering or the port is lost; the client is then disconnected. */
	onLinkLost(listener: (error: RemoteIoError) => void): void {
		this.lostListener = listener;
	}

	/**
	 * Opens the link. With `remoteIo` (the default) the board is then configured to serve its pins
	 * to Studomate; without it the board is left as it is, and `resumeRemoteIo` can configure it
	 * later.
	 */
	async connect({
		remoteIo = true,
	}: { remoteIo?: boolean } = {}): Promise<RemoteIoFirmwareInfo> {
		if (this.state !== "disconnected") {
			throw new Error("RemoteIoClient is already connecting or linked");
		}
		this.setState("connecting");
		const { transport } = this.options;
		try {
			this.unsubscribers.push(
				transport.onData((chunk) => this.handleChunk(chunk)),
				transport.onClose(() => this.handleTransportClosed()),
			);
			const aborted = new Promise<never>((_, reject) => {
				this.connectAbort = reject;
			});
			const run = async () => {
				try {
					await transport.open();
				} catch (cause) {
					throw new RemoteIoError("transport", String(cause));
				}
				const info = await this.handshake();
				if (remoteIo) await this.configure();
				return info;
			};
			const info = await Promise.race([run(), aborted]);
			this.connectAbort = null;
			this.remoteIoActive = remoteIo;
			this.setState("linked");
			if (remoteIo) this.startHeartbeat();
			return info;
		} catch (error) {
			this.connectAbort = null;
			await this.teardown();
			throw error instanceof RemoteIoError
				? error
				: new RemoteIoError("transport", String(error));
		}
	}

	/**
	 * Sets the wanted value of output variables and sends the full output image. Values of
	 * unknown variables are ignored; analog values are rounded and saturated to the pin range.
	 */
	setOutputs(
		values: Map<string, boolean | number> | Record<string, boolean | number>,
	) {
		const entries =
			values instanceof Map ? values : new Map(Object.entries(values));
		for (const output of this.plan.outputs) {
			if (!entries.has(output.variableId)) continue;
			const raw = entries.get(output.variableId)!;
			const { min, max } = output.range;
			const numeric =
				typeof raw === "boolean" ? (raw ? 1 : 0) : Math.round(raw);
			this.outputValues.set(output.pin, Math.min(max, Math.max(min, numeric)));
		}
		void this.sendOutputs();
	}

	/**
	 * Applies a new pin plan to a linked board: outputs go back to 0, and input images are ignored
	 * until the board acknowledges the new configuration.
	 */
	async reconfigure(plan: RemoteIoPlan): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		this.plan = plan;
		this.resetOutputs();
		if (!this.remoteIoActive) return;
		this.reconfiguring = true;
		try {
			await this.configure();
		} finally {
			this.reconfiguring = false;
		}
	}

	/**
	 * Transfers a program image to the board, which stores it and runs it on its own. The link
	 * stays up, but the board no longer serves remote I/O until `resumeRemoteIo`. If the transfer
	 * fails the board is put back in remote I/O mode if it was in it.
	 */
	async uploadProgram(
		image: Uint8Array,
		imageId: number,
		onProgress?: (sentBytes: number, totalBytes: number) => void,
	): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}

		const wasActive = this.remoteIoActive;
		this.stopHeartbeat?.();
		this.stopHeartbeat = null;
		this.remoteIoActive = false;
		this.watch = null;
		this.uploading = true;
		try {
			await this.sendProgramFrame(
				encodeProgramBegin(image.length, imageId),
				(message) => (message.type === "PROG_READY" ? true : undefined),
			);
			for (let offset = 0, seq = 0; offset < image.length; seq++) {
				const chunk = image.subarray(offset, offset + PROGRAM_CHUNK_BYTES);
				await this.sendProgramFrame(
					encodeProgramChunk(seq, chunk),
					(message) =>
						message.type === "PROG_ACK" && message.seq === seq
							? true
							: undefined,
				);
				offset += chunk.length;
				onProgress?.(offset, image.length);
			}
			const stored = await this.sendProgramFrame(
				encodeProgramEnd(),
				(message) => (message.type === "PROG_OK" ? message.imageId : undefined),
			);
			if (stored !== imageId) {
				throw new RemoteIoError("upload-mismatch", String(stored));
			}
		} catch (error) {
			this.uploading = false;
			if (wasActive) {
				try {
					await this.configure();
					this.remoteIoActive = true;
					this.startHeartbeat();
				} catch {
					this.loseLink(
						new RemoteIoError("transport", "board lost after a failed upload"),
					);
				}
			}
			throw error instanceof RemoteIoError
				? error
				: new RemoteIoError("transport", String(error));
		}
		this.uploading = false;
	}

	/** Starts the program stored in the board, from its initial state. */
	async runProgram(): Promise<void> {
		await this.commandProgram(encodeProgramRun(), (message) =>
			message.type === "PROG_OK" ? true : undefined,
		);
	}

	/** Halts the program of the board and releases its pins. */
	async stopProgram(): Promise<void> {
		await this.commandProgram(encodeProgramStop(), (message) =>
			message.type === "PROG_STOPPED" ? true : undefined,
		);
	}

	/**
	 * Sends a command that takes the board out of remote I/O. If the board refuses, remote I/O is
	 * restored when it was active.
	 */
	private async commandProgram(
		frame: string,
		pick: (message: DeviceMessage) => true | undefined,
	): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		const wasActive = this.remoteIoActive;
		this.watch = null;
		this.stopHeartbeat?.();
		this.stopHeartbeat = null;
		this.remoteIoActive = false;
		try {
			await this.sendProgramFrame(frame, pick);
		} catch (error) {
			if (wasActive) {
				try {
					await this.configure();
					this.remoteIoActive = true;
					this.startHeartbeat();
				} catch {
					this.loseLink(
						new RemoteIoError(
							"transport",
							"board lost after a refused command",
						),
					);
				}
			}
			throw error instanceof RemoteIoError
				? error
				: new RemoteIoError("transport", String(error));
		}
	}

	/**
	 * Has the board stop serving its pins: its outputs fall back to 0 and it keeps no
	 * configuration. The link stays open; `resumeRemoteIo` serves the pins again.
	 */
	async leaveRemoteIo(): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		if (!this.remoteIoActive) return;
		await this.fallback();
		this.stopHeartbeat?.();
		this.stopHeartbeat = null;
		this.remoteIoActive = false;
		this.reconfiguring = true;
		try {
			await this.serialize(async () => {
				const wait = this.waitFor<true>(
					(message) => (message.type === "CFG_OK" ? true : undefined),
					this.options.configTimeoutMs,
					() => new RemoteIoError("config-rejected", "timeout"),
				);
				wait.catch(() => {});
				await this.options.transport.write(encodeConfig([]));
				await wait;
			});
		} finally {
			this.reconfiguring = false;
		}
	}

	/**
	 * Takes the pins back from the program the board runs: the board goes back to remote I/O with
	 * the current pin plan, and the program stays stored in it until the next reset.
	 */
	async resumeRemoteIo(): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		if (this.remoteIoActive) return;
		this.watch = null;
		this.resetOutputs();
		this.reconfiguring = true;
		try {
			await this.configure();
		} finally {
			this.reconfiguring = false;
		}
		this.remoteIoActive = true;
		this.startHeartbeat();
	}

	/**
	 * Has the board send the variable memory of its running program, to follow it from here. The
	 * telemetry stops when the program stops or the board is given its pins back.
	 */
	async startWatching(options: RemoteIoWatchOptions): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		this.watch = {
			assembler: new TelemetryAssembler(options.memorySize),
			tag: options.imageId & 0xffff,
			options,
			mismatchReported: false,
		};
		try {
			await this.sendProgramFrame(encodeWatch(true), (message) =>
				message.type === "WATCH_OK" ? true : undefined,
			);
		} catch (error) {
			this.watch = null;
			throw error;
		}
	}

	/** Stops following the program; the board stops sending its memory. */
	async stopWatching(): Promise<void> {
		if (!this.watch) return;
		this.watch = null;
		if (this.state !== "linked") return;
		try {
			await this.sendProgramFrame(encodeWatch(false), (message) =>
				message.type === "WATCH_OK" ? true : undefined,
			);
		} catch {
			// The board is gone or busy: it stops sending when its program stops.
		}
	}

	/** Writes a variable of the running program, by its index in the image, once. */
	async writeVariable(index: number, value: number): Promise<void> {
		await this.commandVariable(encodeSetVariable(index, value), "SET_OK");
	}

	/** Imposes a value on a variable until released: the program no longer changes it. */
	async forceVariable(index: number, value: number): Promise<void> {
		await this.commandVariable(encodeForce(index, value), "FORCE_OK");
	}

	/** Releases a forced variable, or every forced variable with `"all"`. */
	async releaseVariable(index: number | "all"): Promise<void> {
		await this.commandVariable(encodeUnforce(index), "FORCE_OK");
	}

	private async commandVariable(
		frame: string,
		answer: "SET_OK" | "FORCE_OK",
	): Promise<void> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		await this.sendProgramFrame(frame, (message) =>
			message.type === answer ? true : undefined,
		);
	}

	/** Asks the board what it is doing and which program it holds. */
	async requestStatus(): Promise<RemoteIoStatus> {
		if (this.state !== "linked") {
			throw new Error("RemoteIoClient is not linked");
		}
		return this.serialize(async () => {
			const wait = this.waitFor<RemoteIoStatus>(
				(message) =>
					message.type === "STATUS"
						? {
								state:
									(["remote-io", "running", "fault", "stopped"] as const)[
										message.state
									] ?? "fault",
								fault: message.fault,
								imageId: message.imageId,
							}
						: undefined,
				this.options.configTimeoutMs,
				() => new RemoteIoError("upload-timeout", "status"),
			);
			wait.catch(() => {});
			try {
				await this.options.transport.write(encodeStatusRequest());
			} catch (cause) {
				throw new RemoteIoError("transport", String(cause));
			}
			return wait;
		});
	}

	/** Forces every output to 0 right away, and keeps them there until `setOutputs` is called. */
	async fallback(): Promise<void> {
		this.resetOutputs();
		await this.sendOutputs();
	}

	/** Drives the outputs to the fallback state, then closes the port. */
	async disconnect(): Promise<void> {
		if (this.state === "disconnected") return;
		if (this.state === "linked") await this.fallback();
		await this.teardown();
	}

	/** Aborts a connection attempt in progress. */
	cancel(): void {
		this.connectAbort?.(new RemoteIoError("cancelled"));
	}

	private resetOutputs() {
		this.outputValues.clear();
		for (const output of this.plan.outputs) {
			this.outputValues.set(output.pin, output.range.min);
		}
	}

	private currentImage(): PinValue[] {
		return [...this.outputValues].map(([pin, value]) => ({ pin, value }));
	}

	private async sendOutputs(): Promise<void> {
		if (this.state !== "linked" || !this.remoteIoActive) return;
		try {
			await this.options.transport.write(encodeOutputs(this.currentImage()));
		} catch (cause) {
			this.loseLink(new RemoteIoError("transport", String(cause)));
		}
	}

	private startHeartbeat() {
		this.stopHeartbeat = this.options.heartbeat(
			() => void this.sendOutputs(),
			this.options.heartbeatIntervalMs,
		);
	}

	private handleChunk(chunk: string) {
		for (const frame of this.decoder.push(chunk)) {
			const message = decodeDeviceMessage(frame);
			if (!message) continue;
			if (message.type === "TEL") {
				this.handleTelemetry(message);
				continue;
			}
			if (message.type === "IN") {
				if (
					this.state === "linked" &&
					this.remoteIoActive &&
					!this.reconfiguring &&
					!this.uploading
				) {
					this.emitInputs(message.values);
				}
				continue;
			}
			this.messageListener?.(message);
		}
	}

	private handleTelemetry(message: Extract<DeviceMessage, { type: "TEL" }>) {
		const { watch } = this;
		if (!watch) return;
		if (message.tag !== watch.tag) {
			if (!watch.mismatchReported) {
				watch.mismatchReported = true;
				watch.options.onProgramMismatch();
			}
			return;
		}
		const snapshot = watch.assembler.push(message);
		if (snapshot) watch.options.onSnapshot(snapshot);
	}

	private emitInputs(values: PinValue[]) {
		const byPin = new Map(values.map((entry) => [entry.pin, entry.value]));
		const result: RemoteIoInputValues = new Map();
		for (const input of this.plan.inputs) {
			const raw = byPin.get(input.pin);
			if (raw === undefined) continue;
			result.set(
				input.variableId,
				input.kind === "digital" ? (raw !== 0) !== input.inverted : raw,
			);
		}
		this.inputsListener?.(result);
	}

	/** Resolves with the first message accepted by `pick`, rejects after `timeoutMs`. */
	private waitFor<T>(
		pick: (message: DeviceMessage) => T | undefined,
		timeoutMs: number,
		onTimeout: () => RemoteIoError,
		beforeEachWait?: () => void,
		repeatMs?: number,
	): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			const finish = () => {
				clearTimeout(timer);
				if (repeat) clearInterval(repeat);
				this.messageListener = null;
			};
			const timer = setTimeout(() => {
				finish();
				reject(onTimeout());
			}, timeoutMs);
			this.messageListener = (message) => {
				try {
					const picked = pick(message);
					if (picked === undefined) return;
					finish();
					resolve(picked);
				} catch (error) {
					finish();
					reject(error);
				}
			};
			beforeEachWait?.();
			const repeat =
				beforeEachWait && repeatMs
					? setInterval(beforeEachWait, repeatMs)
					: null;
		});
	}

	private async handshake(): Promise<RemoteIoFirmwareInfo> {
		const ping = () =>
			void this.options.transport.write(encodePing()).catch(() => {});
		return this.waitFor<RemoteIoFirmwareInfo>(
			(message) => {
				if (message.type !== "PONG") return undefined;
				if (message.protocolMajor !== PROTOCOL_MAJOR_VERSION) {
					throw new RemoteIoError("protocol-mismatch", message.protocol);
				}
				if (
					this.options.minFirmwareVersion &&
					isFirmwareOutdated(message.firmware, this.options.minFirmwareVersion)
				) {
					throw new RemoteIoError("firmware-outdated", message.firmware);
				}
				return {
					protocol: message.protocol,
					firmware: message.firmware,
					inputPeriodMs: message.inputPeriodMs,
				};
			},
			this.options.handshakeTimeoutMs,
			() => new RemoteIoError("handshake-timeout"),
			ping,
			this.options.pingIntervalMs,
		);
	}

	private async configure(): Promise<void> {
		const wait = this.waitFor<true>(
			(message) => {
				if (message.type === "CFG_OK") return true;
				if (message.type === "ERR") {
					throw new RemoteIoError("config-rejected", message.code);
				}
				return undefined;
			},
			this.options.configTimeoutMs,
			() => new RemoteIoError("config-rejected", "timeout"),
		);
		try {
			await this.options.transport.write(encodeConfig(this.plan.pins));
		} catch (cause) {
			throw new RemoteIoError("transport", String(cause));
		}
		await wait;
	}

	/** Sends one program frame and waits for its answer, resending it when the answer never comes. */
	private sendProgramFrame<T>(
		frame: string,
		pick: (message: DeviceMessage) => T | undefined,
	): Promise<T> {
		return this.serialize(() => this.exchangeProgramFrame(frame, pick));
	}

	/** Runs `task` after the exchanges queued before it have finished, whatever their outcome. */
	private serialize<T>(task: () => Promise<T>): Promise<T> {
		const result = this.exchanges.then(task, task);
		this.exchanges = result.catch(() => {});
		return result;
	}

	private async exchangeProgramFrame<T>(
		frame: string,
		pick: (message: DeviceMessage) => T | undefined,
	): Promise<T> {
		const { uploadAttempts, uploadAckTimeoutMs, transport } = this.options;
		for (let attempt = 1; ; attempt++) {
			const wait = this.waitFor<T>(
				(message) => {
					if (message.type === "ERR") {
						throw new RemoteIoError("upload-rejected", message.code);
					}
					return pick(message);
				},
				uploadAckTimeoutMs,
				() => new RemoteIoError("upload-timeout"),
			);
			wait.catch(() => {});
			try {
				await transport.write(frame);
			} catch (cause) {
				throw new RemoteIoError("transport", String(cause));
			}
			try {
				return await wait;
			} catch (error) {
				const retryable =
					error instanceof RemoteIoError && error.code === "upload-timeout";
				if (!retryable || attempt >= uploadAttempts) throw error;
			}
		}
	}

	private handleTransportClosed() {
		if (this.state === "connecting") {
			this.connectAbort?.(new RemoteIoError("transport", "port closed"));
			return;
		}
		this.loseLink(new RemoteIoError("transport", "port closed"));
	}

	private loseLink(error: RemoteIoError) {
		if (this.state !== "linked") return;
		void this.teardown().then(() => this.lostListener?.(error));
	}

	private async teardown(): Promise<void> {
		this.watch = null;
		this.stopHeartbeat?.();
		this.stopHeartbeat = null;
		this.messageListener = null;
		for (const unsubscribe of this.unsubscribers) unsubscribe();
		this.unsubscribers = [];
		this.setState("disconnected");
		try {
			await this.options.transport.close();
		} catch {
			// The port is already gone.
		}
	}

	private setState(state: RemoteIoState) {
		if (this.state === state) return;
		this.state = state;
		this.stateListener?.(state);
	}
}
