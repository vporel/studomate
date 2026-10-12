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
import type { RemoteIoClientFactory } from "./browser-remote-io-client";
import type HardwareLinkNotifier from "./hardware-link.notifier";

export type HardwareLinkStatus = "disconnected" | "connecting" | "linked";

export interface HardwareLinkState {
	status: HardwareLinkStatus;
	/** Input variables whose value comes from a pin while the board is linked. */
	drivenInputIds: string[];
}

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
	private readonly onPageHide = () => void this.client?.fallback();
	/**
	 * A hidden tab runs the PLC at a throttled rate (down to one cycle per minute), far slower
	 * than the heartbeat: the outputs would stay frozen at their last state. They are cut while
	 * the tab is hidden, and the PLC does not drive them until it is visible again.
	 */
	private outputsSuspended = false;
	private readonly onVisibilityChange = () => {
		if (document.visibilityState === "hidden") {
			if (this.getStoreState().hardwareLink.status !== "linked") return;
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
		private readonly createClient: RemoteIoClientFactory,
	) {}

	/** Opens the link. Call it from a user gesture, as the browser may ask for a port. */
	async link(): Promise<void> {
		if (this.getStoreState().hardwareLink.status !== "disconnected") return;
		const resolved = this.resolvePlan();
		if (!resolved) return;
		this.setLinkState({ status: "connecting", drivenInputIds: [] });
		const attempt = this.attempt;

		let client: RemoteIoClient | null = null;
		try {
			client = await this.createClient(resolved.plan, resolved.descriptor);
			if (attempt !== this.attempt) return;
			this.client = client;
			client.onInputs((values) => this.handleInputs(values));
			client.onLinkLost(() => this.handleLinkLost(client!));
			await client.connect();
		} catch (error) {
			if (attempt !== this.attempt) return;
			this.client = null;
			this.setLinkState(DISCONNECTED_HARDWARE_LINK);
			this.reportFailure(error);
			return;
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

	private reset() {
		this.attempt++;
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

	private setLinkState(hardwareLink: HardwareLinkState) {
		this.setStoreState(() => ({ hardwareLink }));
	}
}
