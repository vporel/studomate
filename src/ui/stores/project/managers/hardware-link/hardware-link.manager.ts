import arduinoIoBindings from "@/bytecode/arduino-io-bindings";
import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import {
	isRemoteIoUploadError,
	RemoteIoError,
} from "@/hardware/arduino/remote-io/remote-io.client";
import buildRemoteIoPlan from "@/hardware/arduino/remote-io/remote-io-plan";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "@/ui/stores/project/project.store";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import BoardProgramController from "./board-program.controller";
import FirmwareInstaller from "./firmware-installer";
import type HardwareLinkContext from "./hardware-link.context";
import type { ResolvedHardwarePlan } from "./hardware-link.context";
import type HardwareLinkNotifier from "./hardware-link.notifier";
import HardwareLinkSession, { type LinkOpener } from "./hardware-link.session";
import {
	DISCONNECTED_HARDWARE_LINK,
	type HardwareLinkState,
} from "./hardware-link.state";
import HardwareSimulationBridge from "./hardware-simulation.bridge";
import OnlineModeController from "./online-mode.controller";
import type { RemoteIoDevice, RemoteIoDeviceFactory } from "./remote-io-device";

/**
 * Link between the project and its real board. The link is a means, not a state of the project:
 * it is opened by the user (the online link), for a program transfer, or by a mode that needs the
 * board (simulation with the real I/O, observation), and it leaves the board as it is. The
 * firmware installation, the program of the board, the observation and the coupling with the
 * simulation are carried out by collaborators it delegates to.
 */
export default class HardwareLinkManager {
	private readonly session = new HardwareLinkSession();
	private readonly context: HardwareLinkContext;
	private readonly firmwareInstaller: FirmwareInstaller;
	private readonly simulationBridge: HardwareSimulationBridge;
	private readonly programController: BoardProgramController;
	private readonly onlineController: OnlineModeController;
	private opening: Promise<boolean> | null = null;

	constructor(
		private readonly setStoreState: ProjectStoreSetFunction,
		private readonly getStoreState: ProjectStoreGetFunction,
		notifier: HardwareLinkNotifier,
		private readonly createDevice: RemoteIoDeviceFactory,
		options: { postFlashDelayMs?: number; onlinePollMs?: number } = {},
	) {
		this.context = {
			session: this.session,
			notifier,
			getStoreState,
			setStoreState,
			setLinkState: (hardwareLink) => this.setLinkState(hardwareLink),
			resolvePlan: () => this.resolvePlan(),
			ioBindings: (plan) => arduinoIoBindings(plan),
			ensureLink: (openedBy) => this.ensureLink(openedBy),
			unlink: () => this.unlink(),
			reportFailure: (error) => this.reportFailure(error),
		};
		this.firmwareInstaller = new FirmwareInstaller(this.context, options);
		this.simulationBridge = new HardwareSimulationBridge(this.context);
		this.programController = new BoardProgramController(
			this.context,
			this.simulationBridge,
		);
		this.onlineController = new OnlineModeController(
			this.context,
			this.simulationBridge,
			options,
		);
	}

	/**
	 * Opens the online link, which the user keeps until they close it. Call it from a user
	 * gesture, as the browser may ask for a port.
	 */
	async link(): Promise<void> {
		if (this.getStoreState().hardwareLink.status === "linked") {
			// A link a mode or a transfer opened becomes the user's own: it stays open.
			this.session.openedBy = "user";
			return;
		}
		await this.ensureLink("user");
	}

	/** Opens the link if it is not open. True when the board is linked afterwards. */
	async ensureLink(openedBy: LinkOpener): Promise<boolean> {
		const status = this.getStoreState().hardwareLink.status;
		if (status === "linked") return true;
		if (status === "connecting" && this.opening) return this.opening;
		this.opening = this.openLink(openedBy).finally(() => {
			this.opening = null;
		});
		return this.opening;
	}

	private async openLink(openedBy: LinkOpener): Promise<boolean> {
		const resolved = this.resolvePlan();
		if (!resolved) return false;
		this.setLinkState({
			status: "connecting",
			drivenInputIds: [],
			boardMode: "idle",
			programPresent: false,
		});
		const { session } = this;
		const attempt = session.attempt;

		let device: RemoteIoDevice;
		try {
			device = await this.createDevice(resolved.plan, resolved.descriptor);
		} catch (error) {
			if (!session.isCurrent(attempt)) return false;
			this.setLinkState(DISCONNECTED_HARDWARE_LINK);
			this.reportFailure(error);
			return false;
		}
		if (!session.isCurrent(attempt)) return false;

		let client: RemoteIoClient;
		let flashed = false;
		for (;;) {
			client = device.createClient();
			session.client = client;
			client.onInputs((values) => this.simulationBridge.handleInputs(values));
			const current = client;
			client.onLinkLost(() => this.handleLinkLost(current));
			try {
				await client.connect({ remoteIo: false });
				break;
			} catch (error) {
				if (!session.isCurrent(attempt)) return false;
				session.client = null;
				const reason = !flashed ? FirmwareInstaller.reasonFor(error) : null;
				if (
					reason &&
					(await this.firmwareInstaller.install(device, reason, attempt))
				) {
					flashed = true;
					continue;
				}
				if (!session.isCurrent(attempt)) return false;
				this.setLinkState(DISCONNECTED_HARDWARE_LINK);
				if (!reason) this.reportFailure(error);
				return false;
			}
		}
		if (!session.isCurrent(attempt)) {
			await client.disconnect();
			return false;
		}

		session.plan = resolved.plan;
		session.openedBy = openedBy;
		this.simulationBridge.attach(resolved.plan);
		this.setLinkState({
			status: "linked",
			drivenInputIds: [],
			boardMode: "idle",
			programPresent: false,
		});
		if (openedBy === "user") this.context.notifier.linked();
		await this.programController.refreshStatus();
		return session.isCurrent(attempt);
	}

	/** Answer of the user to the firmware installation dialog. */
	answerFirmwareInstall(accepted: boolean): void {
		this.firmwareInstaller.answer(accepted);
	}

	/** Answer of the user to the question whether to start the program of the board. */
	answerObservationStart(accepted: boolean): void {
		this.onlineController.answerStart(accepted);
	}

	/** Closes the link, driving the outputs of the board to their fallback state first. */
	async unlink(): Promise<void> {
		const client = this.session.client;
		if (this.getStoreState().hardwareLink.status === "disconnected") return;
		const wasConnecting =
			this.getStoreState().hardwareLink.status === "connecting";
		this.reset();
		if (!client) return;
		if (wasConnecting) client.cancel();
		else await client.disconnect();
	}

	/** Loads the program of the project into the board, which then runs it by itself. */
	uploadProgram(): Promise<void> {
		return this.programController.upload();
	}

	/** Starts the program stored in the board, from its initial state. */
	runProgram(): Promise<void> {
		return this.programController.run();
	}

	/** Halts the program of the board and releases its pins. */
	stopProgram(): Promise<void> {
		return this.programController.stop();
	}

	/**
	 * Has the board serve its pins to the simulation about to start, opening the link if needed.
	 * True when it does.
	 */
	async enterHardwareIo(): Promise<boolean> {
		if (!(await this.ensureLink("mode"))) return false;
		return this.programController.enterRemoteIo();
	}

	/** The board stops serving its pins to a simulation that could not start. */
	leaveHardwareIo(): Promise<void> {
		return this.programController.leaveRemoteIo();
	}

	/**
	 * Observes the program of the board, opening the link if needed. True when the observation
	 * began.
	 */
	goOnline(): Promise<boolean> {
		return this.onlineController.start();
	}

	/** Writes a variable of the observed program once. */
	writeBoardVariable(name: string, value: boolean | number): Promise<void> {
		return this.onlineController.writeVariable(name, value);
	}

	/** Imposes a value on a variable of the observed program until it is released. */
	forceBoardVariable(name: string, value: boolean | number): Promise<void> {
		return this.onlineController.forceVariable(name, value);
	}

	releaseBoardVariable(name: string): Promise<void> {
		return this.onlineController.releaseVariable(name);
	}

	/**
	 * Called when a simulation is about to stop: the board is left as the simulation found it
	 * (pins released, observation over).
	 */
	async onSimulationStop(): Promise<void> {
		const kind = this.getStoreState().simulationKind;
		if (kind === "observation") await this.onlineController.stop();
		else if (kind === "hardware-io")
			await this.programController.leaveRemoteIo();
	}

	/**
	 * Called once a mode is in place: a link a mode opened for itself is closed when the mode in
	 * place no longer needs the board.
	 */
	async onModeSettled(): Promise<void> {
		const state = this.getStoreState();
		if (
			this.session.openedBy === "mode" &&
			state.hardwareLink.status === "linked" &&
			!(
				state.mode === ProjectMode.SIMULATION &&
				state.simulationKind !== "virtual"
			)
		) {
			await this.unlink();
		}
	}

	/**
	 * Called when a simulation starts: re-applies the pin configuration if the project changed
	 * since the link was opened, then gives the PLC the latest pin values.
	 */
	onSimulationStart(): void {
		this.simulationBridge.onSimulationStart();
	}

	/** Writes the output image of a finished PLC cycle to the board. */
	onCycleEnd(snapshot: readonly PLCVariable[]): void {
		this.simulationBridge.onCycleEnd(snapshot);
	}

	/** Safe state: all outputs of the board at 0, right now. The link stays open. */
	fallback(): void {
		this.simulationBridge.fallback();
	}

	private resolvePlan(): ResolvedHardwarePlan | null {
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

	private handleLinkLost(client: RemoteIoClient) {
		if (this.session.client !== client) return;
		const state = this.getStoreState();
		const hadHardwareIo =
			state.mode === ProjectMode.SIMULATION &&
			state.simulationKind === "hardware-io";
		this.reset();
		// A simulation with the real I/O goes on, with virtual inputs.
		if (hadHardwareIo) state.simulationManager.setSimulationKind("virtual");
		this.context.notifier.linkLost();
	}

	private reset() {
		this.onlineController.detach();
		this.session.invalidate();
		this.firmwareInstaller.cancel();
		this.simulationBridge.detach();
		this.setLinkState(DISCONNECTED_HARDWARE_LINK);
	}

	private reportFailure(error: unknown) {
		// The user dismissed the port chooser.
		if (error instanceof DOMException && error.name === "NotFoundError") return;
		if (error instanceof RemoteIoError) {
			if (error.code === "cancelled") return;
			this.context.notifier.linkFailed(
				isRemoteIoUploadError(error.code) ? "transport" : error.code,
			);
			return;
		}
		this.context.notifier.linkFailed("transport");
	}

	private setLinkState(hardwareLink: HardwareLinkState) {
		this.setStoreState(() => ({ hardwareLink }));
	}
}
