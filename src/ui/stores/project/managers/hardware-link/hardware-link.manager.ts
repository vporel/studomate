import {
	FlashError,
	flashFirmware,
	type FlashProgress,
} from "@/hardware/arduino/flash/stk500";
import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import { RemoteIoError } from "@/hardware/arduino/remote-io/remote-io.client";
import buildRemoteIoPlan, {
	type RemoteIoPlan,
} from "@/hardware/arduino/remote-io/remote-io-plan";
import type { HardwareDeviceDescriptor } from "@/hardware/hardware-device.descriptor";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type { RemoteIoDevice, RemoteIoDeviceFactory } from "./remote-io-device";
import type HardwareLinkNotifier from "./hardware-link.notifier";

export type HardwareLinkStatus = "disconnected" | "connecting" | "linked";

export interface HardwareLinkState {
	status: HardwareLinkStatus;
	/** Input variables whose value comes from a pin while the board is linked. */
	drivenInputIds: string[];
}

/** Why the firmware of the board has to be installed. */
export type FirmwareInstallReason = "missing" | "outdated";

export interface HardwareFirmwareState {
	/** `confirming`: the user is asked before the program of the board is erased. */
	phase: "idle" | "confirming" | "flashing";
	reason: FirmwareInstallReason | null;
	progress: FlashProgress | null;
}

export const IDLE_HARDWARE_FIRMWARE: HardwareFirmwareState = {
	phase: "idle",
	reason: null,
	progress: null,
};

const POST_FLASH_DELAY_MS = 1500;

export const DISCONNECTED_HARDWARE_LINK: HardwareLinkState = {
	status: "disconnected",
	drivenInputIds: [],
};

/**
 * Link between the project and its real board. Independent of the project mode: the board can be
 * linked in Design or Simulation. While linked and simulating, pins drive the mapped input
 * variables and the outputs of each PLC cycle are written to the board.
 */
export default class HardwareLinkManager {
	private client: RemoteIoClient | null = null;
	/** Incremented each time the link is reset: a stale connection attempt must not resurrect it. */
	private attempt = 0;
	private plan: RemoteIoPlan | null = null;
	private outputIds = new Set<string>();
	private lastInputs = new Map<string, boolean | number>();
	private resolveInstallAnswer: ((accepted: boolean) => void) | null = null;
	private flashAbort: AbortController | null = null;
	private readonly onPageHide = () => void this.client?.fallback();
	/**
	 * A hidden tab runs the PLC at a throttled rate (down to one cycle per minute), far slower
	 * than the heartbeat: the outputs would stay frozen at their last state. They are cut while
	 * the tab is hidden, and the PLC does not drive them until it is visible again.
	 */
	private outputsSuspended = false;
	private readonly onVisibilityChange = () => {
		if (document.visibilityState === "hidden") {
			const state = this.getStoreState();
			// Outside a running simulation no PLC cycle drives the outputs: nothing to cut.
			if (
				state.hardwareLink.status !== "linked" ||
				state.mode !== ProjectMode.SIMULATION ||
				state.simulationPaused
			) {
				return;
			}
			this.outputsSuspended = true;
			void this.client?.fallback();
		} else if (this.outputsSuspended) {
			this.outputsSuspended = false;
			this.notifier.outputsCutInBackground();
		}
	};

	constructor(
		private readonly setStoreState: ProjectStoreSetFunction,
		private readonly getStoreState: ProjectStoreGetFunction,
		private readonly notifier: HardwareLinkNotifier,
		private readonly createDevice: RemoteIoDeviceFactory,
		private readonly options: { postFlashDelayMs?: number } = {},
	) {}

	/** Opens the link. Call it from a user gesture, as the browser may ask for a port. */
	async link(): Promise<void> {
		if (this.getStoreState().hardwareLink.status !== "disconnected") return;
		const resolved = this.resolvePlan();
		if (!resolved) return;
		this.setLinkState({ status: "connecting", drivenInputIds: [] });
		const attempt = this.attempt;

		let device: RemoteIoDevice;
		try {
			device = await this.createDevice(resolved.plan, resolved.descriptor);
		} catch (error) {
			if (attempt !== this.attempt) return;
			this.setLinkState(DISCONNECTED_HARDWARE_LINK);
			this.reportFailure(error);
			return;
		}
		if (attempt !== this.attempt) return;

		let client: RemoteIoClient;
		let flashed = false;
		for (;;) {
			client = device.createClient();
			this.client = client;
			client.onInputs((values) => this.handleInputs(values));
			const current = client;
			client.onLinkLost(() => this.handleLinkLost(current));
			try {
				await client.connect();
				break;
			} catch (error) {
				if (attempt !== this.attempt) return;
				this.client = null;
				const reason = !flashed ? firmwareInstallReason(error) : null;
				if (reason && (await this.installFirmware(device, reason, attempt))) {
					flashed = true;
					continue;
				}
				if (attempt !== this.attempt) return;
				this.setLinkState(DISCONNECTED_HARDWARE_LINK);
				if (!reason) this.reportFailure(error);
				return;
			}
		}
		if (attempt !== this.attempt) {
			await client.disconnect();
			return;
		}

		this.plan = resolved.plan;
		this.adoptPlan(resolved.plan);
		window.addEventListener("pagehide", this.onPageHide);
		document.addEventListener("visibilitychange", this.onVisibilityChange);
		this.setLinkState({
			status: "linked",
			drivenInputIds: resolved.plan.inputs.map((input) => input.variableId),
		});
		this.notifier.linked();
	}

	/** Answer of the user to the firmware installation dialog. */
	answerFirmwareInstall(accepted: boolean): void {
		this.resolveInstallAnswer?.(accepted);
	}

	/** Closes the link, driving the outputs of the board to their fallback state first. */
	async unlink(): Promise<void> {
		const client = this.client;
		if (this.getStoreState().hardwareLink.status === "disconnected") return;
		const wasConnecting =
			this.getStoreState().hardwareLink.status === "connecting";
		this.reset();
		if (!client) return;
		if (wasConnecting) client.cancel();
		else await client.disconnect();
	}

	/**
	 * Called when a simulation starts: re-applies the pin configuration if the project changed
	 * since the link was opened, then gives the PLC the latest pin values.
	 */
	onSimulationStart(): void {
		if (this.getStoreState().hardwareLink.status !== "linked" || !this.client) {
			return;
		}
		const resolved = this.resolvePlan();
		if (!resolved) {
			void this.unlink();
			return;
		}
		if (JSON.stringify(resolved.plan) !== JSON.stringify(this.plan)) {
			this.lastInputs.clear();
			this.adoptPlan(resolved.plan);
			this.plan = resolved.plan;
			this.setLinkState({
				status: "linked",
				drivenInputIds: resolved.plan.inputs.map((input) => input.variableId),
			});
			const client = this.client;
			client.reconfigure(resolved.plan).catch((error) => {
				if (this.client !== client) return;
				void this.unlink();
				this.reportFailure(error);
			});
			return;
		}
		this.applyToSimulation(this.lastInputs);
	}

	/** Writes the output image of a finished PLC cycle to the board. */
	onCycleEnd(snapshot: readonly PLCVariable[]): void {
		if (
			this.getStoreState().hardwareLink.status !== "linked" ||
			!this.client ||
			this.outputsSuspended ||
			this.outputIds.size === 0
		) {
			return;
		}
		const values = new Map<string, boolean | number>();
		for (const variable of snapshot) {
			const id = variable.getId();
			if (!this.outputIds.has(id)) continue;
			const value = variable.getValue();
			if (typeof value === "boolean" || typeof value === "number") {
				values.set(id, value);
			}
		}
		this.client.setOutputs(values);
	}

	/** Safe state: all outputs of the board at 0, right now. The link stays open. */
	fallback(): void {
		if (this.getStoreState().hardwareLink.status !== "linked") return;
		void this.client?.fallback();
	}

	private resolvePlan(): {
		plan: RemoteIoPlan;
		descriptor: HardwareDeviceDescriptor;
	} | null {
		const project = this.getStoreState().project;
		const target = project?.hardwareTarget;
		if (!project || !target || target.modelId !== "arduino-uno-r3") return null;
		const descriptor = HardwareDeviceRegistry.get(target.modelId);
		if (!descriptor) return null;
		return {
			plan: buildRemoteIoPlan(target, project.variables, descriptor),
			descriptor,
		};
	}

	private adoptPlan(plan: RemoteIoPlan) {
		this.outputIds = new Set(plan.outputs.map((output) => output.variableId));
	}

	private handleInputs(values: ReadonlyMap<string, boolean | number>) {
		const changed = new Map<string, boolean | number>();
		for (const [id, value] of values) {
			if (this.lastInputs.get(id) === value) continue;
			this.lastInputs.set(id, value);
			changed.set(id, value);
		}
		if (changed.size > 0) this.applyToSimulation(changed);
	}

	private applyToSimulation(values: ReadonlyMap<string, boolean | number>) {
		if (values.size === 0) return;
		this.getStoreState().simulationManager.applyHardwareInputs(values);
	}

	private handleLinkLost(client: RemoteIoClient) {
		if (this.client !== client) return;
		this.reset();
		this.notifier.linkLost();
	}

	/**
	 * Asks the user, then writes the shipped firmware to the board. Resolves to true when the
	 * board has restarted on the new firmware; false when declined, failed or abandoned.
	 */
	private async installFirmware(
		device: RemoteIoDevice,
		reason: FirmwareInstallReason,
		attempt: number,
	): Promise<boolean> {
		this.setFirmwareState({ phase: "confirming", reason, progress: null });
		const accepted = await new Promise<boolean>((resolve) => {
			this.resolveInstallAnswer = resolve;
		});
		this.resolveInstallAnswer = null;
		if (!accepted || attempt !== this.attempt) {
			this.setFirmwareState(IDLE_HARDWARE_FIRMWARE);
			return false;
		}

		this.setFirmwareState({ phase: "flashing", reason, progress: null });
		const abort = new AbortController();
		this.flashAbort = abort;
		try {
			let image: Uint8Array;
			try {
				image = await device.loadFirmware();
			} catch {
				throw new FlashError("firmware-unavailable");
			}
			await flashFirmware({
				transport: device.transport,
				image,
				signal: abort.signal,
				onProgress: (progress) =>
					this.setFirmwareState({ phase: "flashing", reason, progress }),
			});
			await new Promise((r) =>
				setTimeout(r, this.options.postFlashDelayMs ?? POST_FLASH_DELAY_MS),
			);
			return attempt === this.attempt;
		} catch (error) {
			if (attempt === this.attempt) {
				console.error("Firmware installation failed:", error);
				const code = error instanceof FlashError ? error.code : "transport";
				if (code !== "cancelled") this.notifier.flashFailed(code);
			}
			return false;
		} finally {
			this.flashAbort = null;
			this.setFirmwareState(IDLE_HARDWARE_FIRMWARE);
		}
	}

	private reset() {
		this.attempt++;
		this.resolveInstallAnswer?.(false);
		this.flashAbort?.abort();
		this.client = null;
		this.plan = null;
		this.outputIds = new Set();
		this.lastInputs = new Map();
		window.removeEventListener("pagehide", this.onPageHide);
		document.removeEventListener("visibilitychange", this.onVisibilityChange);
		this.outputsSuspended = false;
		this.setLinkState(DISCONNECTED_HARDWARE_LINK);
	}

	private reportFailure(error: unknown) {
		// The user dismissed the port chooser.
		if (error instanceof DOMException && error.name === "NotFoundError") return;
		if (error instanceof RemoteIoError) {
			if (error.code === "cancelled") return;
			this.notifier.linkFailed(error.code);
			return;
		}
		this.notifier.linkFailed("transport");
	}

	private setFirmwareState(hardwareFirmware: HardwareFirmwareState) {
		this.setStoreState(() => ({ hardwareFirmware }));
	}

	private setLinkState(hardwareLink: HardwareLinkState) {
		this.setStoreState(() => ({ hardwareLink }));
	}
}

/** The firmware has to be (re)installed when the board stays silent or runs an incompatible version. */
function firmwareInstallReason(error: unknown): FirmwareInstallReason | null {
	if (!(error instanceof RemoteIoError)) return null;
	if (error.code === "handshake-timeout") return "missing";
	if (
		error.code === "protocol-mismatch" ||
		error.code === "firmware-outdated"
	) {
		return "outdated";
	}
	return null;
}
