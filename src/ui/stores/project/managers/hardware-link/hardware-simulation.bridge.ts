import type PLCVariable from "@/simulator/core/plc/plc-variable";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type HardwareLinkContext from "./hardware-link.context";
import { drivenInputIdsOf } from "./hardware-link.state";

/**
 * Couples the linked board to the simulation: pin values drive the mapped input variables, and
 * the outputs of each PLC cycle are written to the board.
 */
export default class HardwareSimulationBridge {
	private outputIds = new Set<string>();
	private lastInputs = new Map<string, boolean | number>();
	private readonly onPageHide = () =>
		void this.context.session.client?.fallback();
	/**
	 * A hidden tab runs the PLC at a throttled rate (down to one cycle per minute), far slower
	 * than the heartbeat: the outputs would stay frozen at their last state. They are cut while
	 * the tab is hidden, and the PLC does not drive them until it is visible again.
	 */
	private outputsSuspended = false;
	private readonly onVisibilityChange = () => {
		if (document.visibilityState === "hidden") {
			const state = this.context.getStoreState();
			// Outside a running simulation no PLC cycle drives the outputs: nothing to cut.
			if (
				state.hardwareLink.status !== "linked" ||
				state.mode !== ProjectMode.SIMULATION ||
				state.simulationPaused
			) {
				return;
			}
			this.outputsSuspended = true;
			void this.context.session.client?.fallback();
		} else if (this.outputsSuspended) {
			this.outputsSuspended = false;
			this.context.notifier.outputsCutInBackground();
		}
	};

	constructor(private readonly context: HardwareLinkContext) {}

	/** Starts following the page lifecycle once a board is linked. */
	attach(plan: RemoteIoPlan): void {
		this.adoptPlan(plan);
		window.addEventListener("pagehide", this.onPageHide);
		document.addEventListener("visibilitychange", this.onVisibilityChange);
	}

	/** Forgets everything about the link that was closed. */
	detach(): void {
		this.outputIds = new Set();
		this.lastInputs = new Map();
		window.removeEventListener("pagehide", this.onPageHide);
		document.removeEventListener("visibilitychange", this.onVisibilityChange);
		this.outputsSuspended = false;
	}

	/** Outputs of this plan are the ones written to the board after each cycle. */
	adoptPlan(plan: RemoteIoPlan): void {
		this.outputIds = new Set(plan.outputs.map((output) => output.variableId));
	}

	/** Pin values are no longer the source of the inputs (the board stopped serving them). */
	clearInputs(): void {
		this.lastInputs = new Map();
	}

	handleInputs(values: ReadonlyMap<string, boolean | number>): void {
		const changed = new Map<string, boolean | number>();
		for (const [id, value] of values) {
			if (this.lastInputs.get(id) === value) continue;
			this.lastInputs.set(id, value);
			changed.set(id, value);
		}
		if (changed.size > 0) this.applyToSimulation(changed);
	}

	/**
	 * Called when a simulation starts: re-applies the pin configuration if the project changed
	 * since the link was opened, then gives the PLC the latest pin values.
	 */
	onSimulationStart(): void {
		const { session } = this.context;
		const state = this.context.getStoreState();
		const link = state.hardwareLink;
		if (link.status !== "linked" || !session.client) return;
		if (
			link.boardMode !== "remote-io" ||
			state.simulationKind !== "hardware-io"
		) {
			return;
		}
		const resolved = this.context.resolvePlan();
		if (!resolved) {
			void this.context.unlink();
			return;
		}
		if (JSON.stringify(resolved.plan) !== JSON.stringify(session.plan)) {
			this.lastInputs.clear();
			this.adoptPlan(resolved.plan);
			session.plan = resolved.plan;
			this.context.setLinkState({
				status: "linked",
				drivenInputIds: drivenInputIdsOf(resolved.plan),
				boardMode: link.boardMode,
				programPresent: link.programPresent,
			});
			const client = session.client;
			client.reconfigure(resolved.plan).catch((error) => {
				if (session.client !== client) return;
				void this.context.unlink();
				this.context.reportFailure(error);
			});
			return;
		}
		this.applyToSimulation(this.lastInputs);
	}

	/** Writes the output image of a finished PLC cycle to the board. */
	onCycleEnd(snapshot: readonly PLCVariable[]): void {
		const { session } = this.context;
		const state = this.context.getStoreState();
		const link = state.hardwareLink;
		if (
			state.simulationKind !== "hardware-io" ||
			link.status !== "linked" ||
			link.boardMode !== "remote-io" ||
			!session.client ||
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
		session.client.setOutputs(values);
	}

	/** Safe state: all outputs of the board at 0, right now. The link stays open. */
	fallback(): void {
		if (this.context.getStoreState().hardwareLink.status !== "linked") return;
		void this.context.session.client?.fallback();
	}

	private applyToSimulation(values: ReadonlyMap<string, boolean | number>) {
		if (values.size === 0) return;
		this.context.getStoreState().simulationManager.applyExternalInputs(values);
	}
}
