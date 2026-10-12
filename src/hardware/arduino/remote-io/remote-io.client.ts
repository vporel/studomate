import {
	decodeDeviceMessage,
	encodeConfig,
	encodeOutputs,
	encodePing,
	PROTOCOL_MAJOR_VERSION,
	type DeviceMessage,
	type PinValue,
} from "./messages";
import { FrameDecoder } from "./frame";
import type { RemoteIoPlan } from "./remote-io-plan";
import type { HeartbeatScheduler } from "@/hardware/heartbeat/heartbeat-scheduler";
import type { SerialTransport } from "./transport";

export type RemoteIoState = "disconnected" | "connecting" | "linked";

export type RemoteIoErrorCode =
	/** No valid `PONG` within the handshake window: blank board or another program. */
	| "handshake-timeout"
	/** The firmware speaks another major protocol version. */
	| "protocol-mismatch"
	/** The board answered `ERR` to the pin configuration. */
	| "config-rejected"
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

export type RemoteIoInputValues = Map<string, boolean | number>;

export interface RemoteIoClientOptions {
	transport: SerialTransport;
	plan: RemoteIoPlan;
	heartbeat: HeartbeatScheduler;
	/** Interval between `OUT` frames; must stay under the firmware watchdog divided by three. */
	heartbeatIntervalMs?: number;
	handshakeTimeoutMs?: number;
	pingIntervalMs?: number;
	configTimeoutMs?: number;
}

const DEFAULTS = {
	heartbeatIntervalMs: 150,
	handshakeTimeoutMs: 3000,
	pingIntervalMs: 250,
	configTimeoutMs: 1000,
};

/**
 * Remote I/O link: handshake, pin configuration, input images in, output images out, and the
 * safe fallback (all outputs at 0) of the firmware watchdog contract.
 */
export default class RemoteIoClient {
	private readonly options: Required<RemoteIoClientOptions>;
	private plan: RemoteIoPlan;
	private reconfiguring = false;
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

	async connect(): Promise<RemoteIoFirmwareInfo> {
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
				await this.configure();
				return info;
			};
			const info = await Promise.race([run(), aborted]);
			this.connectAbort = null;
			this.setState("linked");
			this.startHeartbeat();
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
		this.reconfiguring = true;
		try {
			await this.configure();
		} finally {
			this.reconfiguring = false;
		}
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
		if (this.state !== "linked") return;
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
			if (message.type === "IN") {
				if (this.state === "linked" && !this.reconfiguring) {
					this.emitInputs(message.values);
				}
				continue;
			}
			this.messageListener?.(message);
		}
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
