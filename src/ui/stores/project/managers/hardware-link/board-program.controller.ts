import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import { remoteIoFailureCode } from "@/hardware/arduino/remote-io/remote-io.client";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type HardwareLinkContext from "./hardware-link.context";
import {
	drivenInputIdsOf,
	IDLE_HARDWARE_UPLOAD,
	type BoardMode,
	type HardwareUploadState,
} from "./hardware-link.state";
import type HardwareSimulationBridge from "./hardware-simulation.bridge";
import prepareBoardProgram from "./prepare-board-program";

/** The program the linked board holds: loading it, starting it, stopping it, and the pins. */
export default class BoardProgramController {
	constructor(
		private readonly context: HardwareLinkContext,
		private readonly bridge: HardwareSimulationBridge,
	) {}

	/**
	 * Compiles the project, checks that it fits the board, and loads it. The board then runs the
	 * program by itself. Only in Design mode: no PLC cycle may write to the board during the
	 * transfer. Without a link, one is opened for the transfer and closed after it.
	 */
	async upload(): Promise<void> {
		const { session, notifier } = this.context;
		const state = this.context.getStoreState();
		const project = state.project;
		const resolved = this.context.resolvePlan();
		if (
			!project ||
			!resolved ||
			state.mode !== ProjectMode.DESIGN ||
			state.hardwareUpload.phase !== "idle" ||
			state.hardwareLink.status === "connecting"
		) {
			return;
		}

		const prepared = prepareBoardProgram(this.context, project, resolved, {
			publishAnalysis: true,
			onFailed: (failure) => notifier.programUploadFailed(failure),
		});
		if (!prepared) return;
		const { image } = prepared;

		if (!(await this.context.ensureLink("upload"))) return;
		const client = session.client;
		if (!client) return;
		const attempt = session.attempt;
		const temporary = session.openedBy === "upload";

		this.setUploadState({
			phase: "uploading",
			sentBytes: 0,
			totalBytes: image.bytes.length,
		});
		try {
			await client.uploadProgram(
				image.bytes,
				image.imageId,
				(sentBytes, totalBytes) =>
					this.setUploadState({ phase: "uploading", sentBytes, totalBytes }),
			);
		} catch (error) {
			this.setUploadState(IDLE_HARDWARE_UPLOAD);
			// A lost link has already been reported and reset.
			if (!session.isCurrent(attempt)) return;
			notifier.programUploadFailed(remoteIoFailureCode(error));
			if (temporary) await this.context.unlink();
			return;
		}
		this.setUploadState(IDLE_HARDWARE_UPLOAD);
		if (!session.isCurrent(attempt)) return;
		this.bridge.clearInputs();
		session.plan = resolved.plan;
		this.setBoardMode("program-running", { programPresent: true });
		notifier.programUploaded();
		if (temporary) await this.context.unlink();
	}

	/** Starts the program stored in the board, from its initial state. */
	async run(): Promise<void> {
		const client = this.controlClient();
		if (!client) return;
		const attempt = this.context.session.attempt;
		try {
			await client.runProgram();
		} catch (error) {
			this.reportCommandFailure(error, attempt);
			return;
		}
		if (!this.context.session.isCurrent(attempt)) return;
		this.bridge.clearInputs();
		this.setBoardMode("program-running");
	}

	/** Halts the program of the board and releases its pins. */
	async stop(): Promise<void> {
		const client = this.controlClient();
		if (!client) return;
		const attempt = this.context.session.attempt;
		try {
			await client.stopProgram();
		} catch (error) {
			this.reportCommandFailure(error, attempt);
			return;
		}
		if (!this.context.session.isCurrent(attempt)) return;
		this.bridge.clearInputs();
		this.setBoardMode("program-stopped");
	}

	/**
	 * Has the board serve its pins to the project (its program, if it runs, is stopped). True when
	 * the board is serving them.
	 */
	async enterRemoteIo(): Promise<boolean> {
		const { session } = this.context;
		const state = this.context.getStoreState();
		const client = session.client;
		if (
			state.hardwareLink.status !== "linked" ||
			!client ||
			state.hardwareUpload.phase !== "idle"
		) {
			return false;
		}
		if (state.hardwareLink.boardMode === "remote-io") return true;
		const resolved = this.context.resolvePlan();
		if (!resolved) return false;
		const attempt = session.attempt;
		try {
			await client.reconfigure(resolved.plan);
			await client.resumeRemoteIo();
		} catch (error) {
			if (!session.isCurrent(attempt)) return false;
			void this.context.unlink();
			this.context.reportFailure(error);
			return false;
		}
		if (!session.isCurrent(attempt)) return false;
		session.plan = resolved.plan;
		this.bridge.adoptPlan(resolved.plan);
		this.setBoardMode("remote-io", { plan: resolved.plan });
		return true;
	}

	/** The board stops serving its pins: its outputs fall back to 0 and it is left alone. */
	async leaveRemoteIo(): Promise<void> {
		const { session } = this.context;
		const client = session.client;
		if (
			this.context.getStoreState().hardwareLink.boardMode !== "remote-io" ||
			!client
		) {
			return;
		}
		const attempt = session.attempt;
		try {
			await client.leaveRemoteIo();
		} catch {
			// The board is gone: the link reports it.
			return;
		}
		if (!session.isCurrent(attempt)) return;
		this.bridge.clearInputs();
		this.setBoardMode("idle");
	}

	/** Asks the board what it is doing and whether it holds a program, once the link is up. */
	async refreshStatus(): Promise<void> {
		const { session } = this.context;
		const client = session.client;
		if (!client) return;
		const attempt = session.attempt;
		try {
			const status = await client.requestStatus();
			if (!session.isCurrent(attempt)) return;
			const link = this.context.getStoreState().hardwareLink;
			if (link.status !== "linked") return;
			this.context.setLinkState({
				...link,
				boardMode: boardModeOf(status.state, link.boardMode),
				programPresent: status.imageId !== 0,
			});
		} catch {
			// The answer is a convenience: without it the start button simply stays hidden.
		}
	}

	/** The client, when a start or stop command can be sent to the board. */
	private controlClient(): RemoteIoClient | null {
		const state = this.context.getStoreState();
		if (
			state.hardwareLink.status !== "linked" ||
			!this.context.session.client ||
			state.hardwareUpload.phase !== "idle"
		) {
			return null;
		}
		return this.context.session.client;
	}

	private reportCommandFailure(error: unknown, attempt: number) {
		// A lost link has already been reported and reset.
		if (!this.context.session.isCurrent(attempt)) return;
		this.context.notifier.programCommandFailed(remoteIoFailureCode(error));
	}

	private setBoardMode(
		boardMode: BoardMode,
		options: { plan?: RemoteIoPlan; programPresent?: boolean } = {},
	) {
		const current = this.context.getStoreState().hardwareLink;
		this.context.setLinkState({
			status: "linked",
			drivenInputIds: options.plan ? drivenInputIdsOf(options.plan) : [],
			boardMode,
			programPresent: options.programPresent ?? current.programPresent,
		});
	}

	private setUploadState(hardwareUpload: HardwareUploadState) {
		this.context.setStoreState(() => ({ hardwareUpload }));
	}
}

/** What the board reports about itself, as a mode; a board serving its pins is told apart here. */
function boardModeOf(
	state: "remote-io" | "running" | "fault" | "stopped",
	current: BoardMode,
): BoardMode {
	if (state === "running") return "program-running";
	if (state === "stopped" || state === "fault") return "program-stopped";
	return current === "remote-io" ? "remote-io" : "idle";
}
