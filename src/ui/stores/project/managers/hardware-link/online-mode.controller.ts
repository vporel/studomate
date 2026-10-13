import type { BytecodeLayout } from "@/bytecode/bytecode.generator";
import decodeVariableMemory, {
	variableMemorySize,
} from "@/bytecode/variable-memory";
import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import {
	isRemoteIoUploadError,
	RemoteIoError,
} from "@/hardware/arduino/remote-io/remote-io.client";
import ProjectAnalyser from "@/project-analyser/project.analyser";
import type HardwareLinkContext from "./hardware-link.context";
import type { OnlineFailure } from "./hardware-link.notifier";
import {
	drivenInputIdsOf,
	IDLE_HARDWARE_OBSERVATION,
	type HardwareObservationState,
} from "./hardware-link.state";
import type HardwareSimulationBridge from "./hardware-simulation.bridge";
import buildProgram from "./program-builder";

const DEFAULT_STATUS_POLL_MS = 2000;

/**
 * Observes the program a linked board runs: its variables, reported by the board, are what the
 * simulation shows. The program keeps running on the board when the interface stops observing.
 */
export default class OnlineModeController {
	private active = false;
	private poll: ReturnType<typeof setInterval> | null = null;
	/** Where each variable of the observed program sits in the board memory. */
	private layout: BytecodeLayout | null = null;
	private resolveStartAnswer: ((accepted: boolean) => void) | null = null;

	constructor(
		private readonly context: HardwareLinkContext,
		private readonly bridge: HardwareSimulationBridge,
		private readonly options: { onlinePollMs?: number } = {},
	) {}

	isActive(): boolean {
		return this.active;
	}

	/** Answer of the user to the question whether to start the program of the board. */
	answerStart(accepted: boolean): void {
		this.resolveStartAnswer?.(accepted);
	}

	/**
	 * Observes the program of the board: it must be the one of the project (compared by identifier,
	 * as TIA Portal compares online and offline blocks) and running; the user is asked before a
	 * stopped program is started. True when the observation began.
	 */
	async start(): Promise<boolean> {
		const { session, notifier } = this.context;
		const state = this.context.getStoreState();
		const project = state.project;
		const resolved = this.context.resolvePlan();
		if (!project || !resolved || this.active) return false;

		const analysis = ProjectAnalyser.analyse(project);
		if (analysis.issues.some((issue) => issue.severity === "error")) {
			notifier.onlineFailed("analysis");
			return false;
		}
		const built = buildProgram({
			project,
			analysis,
			ioBindings: this.context.ioBindings(resolved.plan),
			limits: resolved.descriptor.limits,
			cyclePeriodMs: state.plcConfig.scanTimeMs,
		});
		if (built.kind === "failed") {
			notifier.onlineFailed(built.failure);
			return false;
		}
		if (built.kind === "blocked") {
			notifier.programBlocked(built.issues);
			return false;
		}
		const { image, compiled } = built;

		if (!(await this.context.ensureLink("mode"))) return false;
		const client = session.client;
		if (!client) return false;
		const attempt = session.attempt;

		try {
			const status = await client.requestStatus();
			if (!session.isCurrent(attempt)) return false;
			if (status.imageId === 0) {
				notifier.onlineFailed("no-program");
				return false;
			}
			if (status.imageId !== image.imageId) {
				notifier.onlineFailed("program-differs");
				return false;
			}
			if (status.state !== "running") {
				if (!(await this.confirmStart())) return false;
				if (!session.isCurrent(attempt)) return false;
				await client.runProgram();
				if (!session.isCurrent(attempt)) return false;
				this.bridge.clearInputs();
			}
			await this.watch(client, image.layout, image.imageId);
		} catch (error) {
			if (!session.isCurrent(attempt)) return false;
			notifier.onlineFailed(onlineFailureOf(error));
			return false;
		}
		if (!session.isCurrent(attempt)) return false;

		const link = this.context.getStoreState().hardwareLink;
		this.context.setLinkState({
			...link,
			boardMode: "program-running",
			programPresent: true,
			// Pins feed their inputs; the other inputs are written from the interface.
			drivenInputIds: drivenInputIdsOf(resolved.plan),
		});
		this.layout = image.layout;
		state.simulationManager.startOnline(compiled);
		this.active = true;
		this.poll = setInterval(
			() => void this.checkBoard(attempt),
			this.options.onlinePollMs ?? DEFAULT_STATUS_POLL_MS,
		);
		return true;
	}

	/** Writes a variable of the observed program once. */
	writeVariable(name: string, value: boolean | number): Promise<void> {
		return this.command(name, (client, index) =>
			client.writeVariable(index, asNumber(value)),
		);
	}

	/** Imposes a value on a variable of the observed program until it is released. */
	forceVariable(name: string, value: boolean | number): Promise<void> {
		return this.command(name, (client, index) =>
			client.forceVariable(index, asNumber(value)),
		);
	}

	releaseVariable(name: string): Promise<void> {
		return this.command(name, (client, index) => client.releaseVariable(index));
	}

	/**
	 * Stops observing the program; the board keeps running it. What was forced is released: a
	 * forced value must not outlive the session that set it.
	 */
	async stop(): Promise<void> {
		if (!this.active) return;
		this.deactivate();
		const link = this.context.getStoreState().hardwareLink;
		if (link.status === "linked") {
			this.context.setLinkState({ ...link, drivenInputIds: [] });
		}
		const client = this.context.session.client;
		await client?.releaseVariable("all").catch(() => {});
		await client?.stopWatching();
	}

	/** The link was closed: nothing is observed any more. */
	detach(): void {
		this.resolveStartAnswer?.(false);
		if (!this.active) return;
		this.deactivate();
		this.context.getStoreState().simulationManager.setDesignMode();
	}

	private async watch(
		client: RemoteIoClient,
		layout: BytecodeLayout,
		imageId: number,
	): Promise<void> {
		await client.startWatching({
			memorySize: variableMemorySize(layout),
			imageId,
			onSnapshot: (snapshot) =>
				this.context
					.getStoreState()
					.simulationManager.publishBoardSnapshot(
						decodeVariableMemory(layout, snapshot.memory),
					),
			onProgramMismatch: () => this.lose("program-differs", 0),
		});
	}

	/** Asks whether to start the stopped program of the board, with a question to the user. */
	private async confirmStart(): Promise<boolean> {
		this.setObservationState({ phase: "confirming" });
		const accepted = await new Promise<boolean>((resolve) => {
			this.resolveStartAnswer = resolve;
		});
		this.resolveStartAnswer = null;
		this.setObservationState(IDLE_HARDWARE_OBSERVATION);
		return accepted;
	}

	private async command(
		name: string,
		send: (client: RemoteIoClient, index: number) => Promise<void>,
	): Promise<void> {
		const { session } = this.context;
		const client = session.client;
		const index = this.layout?.variableIndexByName[name];
		// A variable the program does not use is not in the board: nothing to write.
		if (!this.active || !client || index === undefined) return;
		const attempt = session.attempt;
		try {
			await send(client, index);
		} catch (error) {
			if (!session.isCurrent(attempt)) return;
			this.context.notifier.boardVariableFailed(
				error instanceof RemoteIoError && isRemoteIoUploadError(error.code)
					? error.code
					: "transport",
			);
		}
	}

	private deactivate() {
		this.layout = null;
		this.active = false;
		if (this.poll) clearInterval(this.poll);
		this.poll = null;
	}

	/** The interface leaves the observation because of what the board did. */
	private lose(
		reason: "program-differs" | "board-fault" | "board-stopped",
		fault: number,
	) {
		if (!this.active) return;
		this.context.notifier.onlineLost(reason, fault);
		this.context.getStoreState().simulationManager.setDesignMode();
	}

	private async checkBoard(attempt: number): Promise<void> {
		const { session } = this.context;
		const client = session.client;
		if (!this.active || !client || !session.isCurrent(attempt)) return;
		try {
			const status = await client.requestStatus();
			if (!this.active || !session.isCurrent(attempt)) return;
			if (status.state === "fault") this.lose("board-fault", status.fault);
			else if (status.state !== "running") this.lose("board-stopped", 0);
		} catch {
			// A silent board is reported by the link itself when the port closes.
		}
	}

	private setObservationState(hardwareObservation: HardwareObservationState) {
		this.context.setStoreState(() => ({ hardwareObservation }));
	}
}

function asNumber(value: boolean | number): number {
	return typeof value === "boolean" ? (value ? 1 : 0) : value;
}

function onlineFailureOf(error: unknown): OnlineFailure {
	if (error instanceof RemoteIoError && isRemoteIoUploadError(error.code)) {
		return error.code;
	}
	return "transport";
}
