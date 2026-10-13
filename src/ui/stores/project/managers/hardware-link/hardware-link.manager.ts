import {
	isRemoteIoUploadError,
	RemoteIoError,
} from "@/hardware/arduino/remote-io/remote-io.client";
import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import buildRemoteIoPlan from "@/hardware/arduino/remote-io/remote-io-plan";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
} from "@/ui/stores/project/project.store";
import BoardProgramController from "./board-program.controller";
import FirmwareInstaller from "./firmware-installer";
import type HardwareLinkContext from "./hardware-link.context";
import type { ResolvedHardwarePlan } from "./hardware-link.context";
import type HardwareLinkNotifier from "./hardware-link.notifier";
import HardwareLinkSession from "./hardware-link.session";
import {
	DISCONNECTED_HARDWARE_LINK,
	drivenInputIdsOf,
	type HardwareLinkState,
} from "./hardware-link.state";
import HardwareSimulationBridge from "./hardware-simulation.bridge";
import type { RemoteIoDevice, RemoteIoDeviceFactory } from "./remote-io-device";

/**
 * Link between the project and its real board. Independent of the project mode: the board can be
 * linked in Design or Simulation. It opens and closes the link; the firmware installation, the
 * program of the board and the coupling with the simulation are carried out by collaborators it
 * delegates to.
 */
export default class HardwareLinkManager {
	private readonly session = new HardwareLinkSession();
	private readonly context: HardwareLinkContext;
	private readonly firmwareInstaller: FirmwareInstaller;
	private readonly simulationBridge: HardwareSimulationBridge;
	private readonly programController: BoardProgramController;

	constructor(
		private readonly setStoreState: ProjectStoreSetFunction,
		private readonly getStoreState: ProjectStoreGetFunction,
		notifier: HardwareLinkNotifier,
		private readonly createDevice: RemoteIoDeviceFactory,
		options: { postFlashDelayMs?: number } = {},
	) {
		this.context = {
			session: this.session,
			notifier,
			getStoreState,
			setStoreState,
			setLinkState: (hardwareLink) => this.setLinkState(hardwareLink),
			resolvePlan: () => this.resolvePlan(),
			unlink: () => this.unlink(),
			reportFailure: (error) => this.reportFailure(error),
		};
		this.firmwareInstaller = new FirmwareInstaller(this.context, options);
		this.simulationBridge = new HardwareSimulationBridge(this.context);
		this.programController = new BoardProgramController(
			this.context,
			this.simulationBridge,
		);
	}

	/** Opens the link. Call it from a user gesture, as the browser may ask for a port. */
	async link(): Promise<void> {
		if (this.getStoreState().hardwareLink.status !== "disconnected") return;
		const resolved = this.resolvePlan();
		if (!resolved) return;
		this.setLinkState({
			status: "connecting",
			drivenInputIds: [],
			boardMode: "remote-io",
			programPresent: false,
		});
		const { session } = this;
		const attempt = session.attempt;

		let device: RemoteIoDevice;
		try {
			device = await this.createDevice(resolved.plan, resolved.descriptor);
		} catch (error) {
			if (!session.isCurrent(attempt)) return;
			this.setLinkState(DISCONNECTED_HARDWARE_LINK);
			this.reportFailure(error);
			return;
		}
		if (!session.isCurrent(attempt)) return;

		let client: RemoteIoClient;
		let flashed = false;
		for (;;) {
			client = device.createClient();
			session.client = client;
			client.onInputs((values) => this.simulationBridge.handleInputs(values));
			const current = client;
			client.onLinkLost(() => this.handleLinkLost(current));
			try {
				await client.connect();
				break;
			} catch (error) {
				if (!session.isCurrent(attempt)) return;
				session.client = null;
				const reason = !flashed ? FirmwareInstaller.reasonFor(error) : null;
				if (
					reason &&
					(await this.firmwareInstaller.install(device, reason, attempt))
				) {
					flashed = true;
					continue;
				}
				if (!session.isCurrent(attempt)) return;
				this.setLinkState(DISCONNECTED_HARDWARE_LINK);
				if (!reason) this.reportFailure(error);
				return;
			}
		}
		if (!session.isCurrent(attempt)) {
			await client.disconnect();
			return;
		}

		session.plan = resolved.plan;
		this.simulationBridge.attach(resolved.plan);
		this.setLinkState({
			status: "linked",
			drivenInputIds: drivenInputIdsOf(resolved.plan),
			boardMode: "remote-io",
			programPresent: false,
		});
		this.context.notifier.linked();
		void this.programController.refreshPresence();
	}

	/** Answer of the user to the firmware installation dialog. */
	answerFirmwareInstall(accepted: boolean): void {
		this.firmwareInstaller.answer(accepted);
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

	/** Sends the program of the project to the board, which then runs it by itself. */
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

	/** Takes the pins back from the program of the board, to link them to the project again. */
	resumeRemoteIo(): Promise<void> {
		return this.programController.resumeRemoteIo();
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
		this.reset();
		this.context.notifier.linkLost();
	}

	private reset() {
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
