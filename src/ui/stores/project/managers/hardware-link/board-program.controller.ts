import arduinoIoBindings from "@/bytecode/arduino-io-bindings";
import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import {
	isRemoteIoUploadError,
	RemoteIoError,
} from "@/hardware/arduino/remote-io/remote-io.client";
import type { RemoteIoPlan } from "@/hardware/arduino/remote-io/remote-io-plan";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type HardwareLinkContext from "./hardware-link.context";
import type { ProgramUploadFailure } from "./hardware-link.notifier";
import {
	drivenInputIdsOf,
	IDLE_HARDWARE_UPLOAD,
	type BoardMode,
	type HardwareUploadState,
} from "./hardware-link.state";
import type HardwareSimulationBridge from "./hardware-simulation.bridge";
import buildProgram from "./program-builder";

/** The program the linked board holds: sending it, starting it, stopping it, and the pins. */
export default class BoardProgramController {
	constructor(
		private readonly context: HardwareLinkContext,
		private readonly bridge: HardwareSimulationBridge,
	) {}

	/**
	 * Compiles the project, checks that it fits the board, and sends it. The board then runs the
	 * program by itself. Only in Design mode: no PLC cycle may write to the board during the
	 * transfer.
	 */
	async upload(): Promise<void> {
		const { session, notifier } = this.context;
		const state = this.context.getStoreState();
		const client = session.client;
		if (
			state.hardwareLink.status !== "linked" ||
			!client ||
			state.mode !== ProjectMode.DESIGN ||
			state.hardwareUpload.phase !== "idle"
		) {
			return;
		}
		const resolved = this.context.resolvePlan();
		const project = state.project;
		if (!resolved || !project) return;

		const { ok, projectAnalysisResult } =
			state.simulationManager.analyze(false);
		if (!ok || !projectAnalysisResult) {
			notifier.programUploadFailed("analysis");
			return;
		}
		const built = buildProgram({
			project,
			analysis: projectAnalysisResult,
			ioBindings: arduinoIoBindings(resolved.plan),
			limits: resolved.descriptor.limits,
			cyclePeriodMs: state.plcConfig.scanTimeMs,
		});
		if (built.kind === "failed") {
			notifier.programUploadFailed(built.failure);
			return;
		}
		if (built.kind === "blocked") {
			notifier.programBlocked(built.issues);
			return;
		}
		const { image } = built;

		const attempt = session.attempt;
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
			notifier.programUploadFailed(uploadFailureOf(error));
			return;
		}
		this.setUploadState(IDLE_HARDWARE_UPLOAD);
		if (!session.isCurrent(attempt)) return;
		this.bridge.clearInputs();
		session.plan = resolved.plan;
		this.setBoardMode("program-running", { programPresent: true });
		notifier.programUploaded();
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

	/** Takes the pins back from the program of the board, to link them to the project again. */
	async resumeRemoteIo(): Promise<void> {
		const { session } = this.context;
		const state = this.context.getStoreState();
		const client = session.client;
		if (
			state.hardwareLink.status !== "linked" ||
			state.hardwareLink.boardMode === "remote-io" ||
			!client ||
			state.hardwareUpload.phase !== "idle"
		) {
			return;
		}
		const resolved = this.context.resolvePlan();
		if (!resolved) return;
		const attempt = session.attempt;
		try {
			await client.reconfigure(resolved.plan);
			await client.resumeRemoteIo();
		} catch (error) {
			if (!session.isCurrent(attempt)) return;
			void this.context.unlink();
			this.context.reportFailure(error);
			return;
		}
		if (!session.isCurrent(attempt)) return;
		session.plan = resolved.plan;
		this.bridge.adoptPlan(resolved.plan);
		this.setBoardMode("remote-io", { plan: resolved.plan });
	}

	/** Asks the board whether it holds a program, once the link is up. */
	async refreshPresence(): Promise<void> {
		const { session } = this.context;
		const client = session.client;
		if (!client) return;
		const attempt = session.attempt;
		try {
			const status = await client.requestStatus();
			if (!session.isCurrent(attempt)) return;
			this.context.setLinkState({
				...this.context.getStoreState().hardwareLink,
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
		this.context.notifier.programCommandFailed(
			error instanceof RemoteIoError && isRemoteIoUploadError(error.code)
				? error.code
				: "transport",
		);
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

function uploadFailureOf(error: unknown): ProgramUploadFailure {
	if (error instanceof RemoteIoError && isRemoteIoUploadError(error.code)) {
		return error.code;
	}
	return "transport";
}
