/** @jest-environment jsdom */
import RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import FakeRemoteIoBoard, {
	createManualHeartbeat,
} from "@tests/utils/fake-remote-io-board";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import HardwareDeviceRegistry from "@/hardware/hardware-device.registry";
import type { ProjectStoreState } from "@/ui/stores/project/project.store";
import HardwareLinkManager from "./hardware-link.manager";
import {
	DISCONNECTED_HARDWARE_LINK,
	IDLE_HARDWARE_FIRMWARE,
	IDLE_HARDWARE_UPLOAD,
} from "./hardware-link.state";
import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";
import FakeUnoBoard from "@tests/utils/fake-uno-board";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type HardwareLinkNotifier from "./hardware-link.notifier";

const FIRMWARE_IMAGE = Uint8Array.from({ length: 256 }, (_, i) => i);

const flush = () => new Promise((r) => setTimeout(r, 0));

function stubNotifier(): jest.Mocked<HardwareLinkNotifier> {
	return {
		linked: jest.fn(),
		linkFailed: jest.fn(),
		linkLost: jest.fn(),
		outputsCutInBackground: jest.fn(),
		flashFailed: jest.fn(),
		programUploaded: jest.fn(),
		programBlocked: jest.fn(),
		programUploadFailed: jest.fn(),
		programCommandFailed: jest.fn(),
	};
}

function setup(
	options: {
		board?: ConstructorParameters<typeof FakeRemoteIoBoard>[0];
		createClientError?: unknown;
		transport?: SerialTransport;
		minFirmwareVersion?: string;
		firmwareFileError?: boolean;
		withTarget?: boolean;
		mode?: ProjectMode;
		analysisOk?: boolean;
	} = {},
) {
	VariableFactory.reset();
	const button = VariableFactory.createLogicInput("BP", "bp").update({
		address: "%PD2",
	});
	const lamp = VariableFactory.createLogicOutput("LAMPE", "lampe").update({
		address: "%PD13",
	});
	const project = ProjectFactory.create([button, lamp], []);
	if (options.withTarget !== false) {
		project.hardwareTarget = { modelId: "arduino-uno-r3" };
	}

	let state = {
		project,
		mode: options.mode ?? ProjectMode.SIMULATION,
		simulationPaused: false,
		hardwareLink: DISCONNECTED_HARDWARE_LINK,
		hardwareFirmware: IDLE_HARDWARE_FIRMWARE,
		hardwareUpload: IDLE_HARDWARE_UPLOAD,
		plcConfig: { scanTimeMs: 100 },
		simulationManager: {
			applyHardwareInputs: jest.fn(),
			analyze: jest.fn(() => ({
				ok: options.analysisOk !== false,
				projectAnalysisResult: {
					totalAnalysedElements: 0,
					issues: [],
					generatedVariables: [],
				},
			})),
		},
	} as unknown as ProjectStoreState;
	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	const board = (options.transport ??
		new FakeRemoteIoBoard(options.board)) as FakeRemoteIoBoard;
	const heartbeat = createManualHeartbeat();
	const notifier = stubNotifier();
	const manager = new HardwareLinkManager(
		set,
		get,
		notifier,
		async (plan) => {
			if (options.createClientError) throw options.createClientError;
			return {
				transport: board,
				createClient: () =>
					new RemoteIoClient({
						transport: board,
						plan,
						heartbeat: heartbeat.scheduler,
						minFirmwareVersion: options.minFirmwareVersion,
						handshakeTimeoutMs: 80,
						pingIntervalMs: 10,
						configTimeoutMs: 80,
					}),
				loadFirmware: async () => {
					if (options.firmwareFileError) throw new Error("404");
					return FIRMWARE_IMAGE;
				},
			};
		},
		{ postFlashDelayMs: 0 },
	);
	return { manager, get, set, board, heartbeat, notifier, project };
}

const snapshotOf = (values: Record<string, boolean | number>) =>
	Object.entries(values).map(
		([id, value]) =>
			({ getId: () => id, getValue: () => value }) as unknown as PLCVariable,
	);

describe("HardwareLinkManager.link", () => {
	it("links, publishes the driven inputs and notifies", async () => {
		const { manager, get, board, notifier } = setup();

		await manager.link();

		expect(get().hardwareLink).toMatchObject({
			status: "linked",
			drivenInputIds: ["bp"],
			boardMode: "remote-io",
		});
		expect(notifier.linked).toHaveBeenCalled();
		const cfg = board.received.find((frame) => frame.command === "CFG");
		expect(cfg?.args).toEqual(["2:IP", "13:O"]);
	});

	it("does nothing without a hardware target", async () => {
		const { manager, get, board } = setup({ withTarget: false });
		await manager.link();
		expect(get().hardwareLink.status).toBe("disconnected");
		expect(board.opened).toBe(false);
	});

	it("is a no-op when already linked", async () => {
		const { manager, board } = setup();
		await manager.link();
		const frames = board.received.length;
		await manager.link();
		expect(board.received.length).toBe(frames);
	});

	it("stays silent when the user dismisses the port chooser", async () => {
		const { manager, get, notifier } = setup({
			createClientError: new DOMException("none chosen", "NotFoundError"),
		});
		await manager.link();
		expect(get().hardwareLink.status).toBe("disconnected");
		expect(notifier.linkFailed).not.toHaveBeenCalled();
	});

	it("reports a transport failure for any other acquisition error", async () => {
		const { manager, notifier } = setup({
			createClientError: new Error("denied"),
		});
		await manager.link();
		expect(notifier.linkFailed).toHaveBeenCalledWith("transport");
	});

	it("is not resurrected by an unlink issued while connecting", async () => {
		const { manager, get, notifier } = setup({
			board: { firmwarePresent: false },
		});
		const linking = manager.link();
		await flush();
		expect(get().hardwareLink.status).toBe("connecting");

		await manager.unlink();
		await linking;

		expect(get().hardwareLink.status).toBe("disconnected");
		expect(notifier.linkFailed).not.toHaveBeenCalled();
		expect(notifier.linked).not.toHaveBeenCalled();
	});
});

describe("HardwareLinkManager inputs", () => {
	it("forwards changed pin values to the simulation, without repeating unchanged ones", async () => {
		const { manager, get, board } = setup();
		await manager.link();
		const apply = get().simulationManager.applyHardwareInputs as jest.Mock;

		board.emitInputs({ "2": 0 });
		board.emitInputs({ "2": 0 });
		board.emitInputs({ "2": 1 });

		expect(apply).toHaveBeenCalledTimes(2);
		expect(Object.fromEntries(apply.mock.calls[0][0])).toEqual({ bp: true });
		expect(Object.fromEntries(apply.mock.calls[1][0])).toEqual({ bp: false });
	});

	it("replays the latest pin values when a simulation starts", async () => {
		const { manager, get, board } = setup();
		await manager.link();
		board.emitInputs({ "2": 0 });
		const apply = get().simulationManager.applyHardwareInputs as jest.Mock;
		apply.mockClear();

		manager.onSimulationStart();

		expect(apply).toHaveBeenCalledTimes(1);
		expect(Object.fromEntries(apply.mock.calls[0][0])).toEqual({ bp: true });
	});

	it("does nothing at simulation start when not linked", () => {
		const { manager, get } = setup();
		manager.onSimulationStart();
		expect(get().simulationManager.applyHardwareInputs).not.toHaveBeenCalled();
	});

	it("reconfigures the board at simulation start when the project changed", async () => {
		const { manager, get, set, board, project } = setup();
		await manager.link();

		const extra = VariableFactory.createLogicInput("BP2", "bp2").update({
			address: "%PD3",
		});
		const changed = project.copy();
		changed.variables = [...project.variables, extra];
		set({ project: changed });
		manager.onSimulationStart();
		await flush();

		const configs = board.received.filter((frame) => frame.command === "CFG");
		expect(configs.at(-1)?.args).toEqual(["2:IP", "13:O", "3:IP"]);
		expect(get().hardwareLink.drivenInputIds).toEqual(["bp", "bp2"]);
	});

	it("does not resend the configuration when the plan is unchanged", async () => {
		const { manager, board } = setup();
		await manager.link();
		const before = board.received.filter((f) => f.command === "CFG").length;

		manager.onSimulationStart();
		await flush();

		expect(board.received.filter((f) => f.command === "CFG").length).toBe(
			before,
		);
	});

	it("unlinks at simulation start when the target was removed", async () => {
		const { manager, get, set, project, board } = setup();
		await manager.link();
		const changed = project.copy();
		changed.hardwareTarget = null;
		set({ project: changed });

		manager.onSimulationStart();
		await flush();

		expect(get().hardwareLink.status).toBe("disconnected");
		expect(board.closed).toBe(true);
	});
});

describe("HardwareLinkManager outputs and fallback", () => {
	it("writes the mapped outputs of a finished cycle, ignoring other variables", async () => {
		const { manager, board } = setup();
		await manager.link();

		manager.onCycleEnd(snapshotOf({ lampe: true, bp: true, autre: 5 }));
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 1 });
	});

	it("does not write when not linked", async () => {
		const { manager, board } = setup();
		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();
		expect(board.received).toEqual([]);
	});

	it("fallback drives outputs to 0 and keeps the link open", async () => {
		const { manager, get, board } = setup();
		await manager.link();
		manager.onCycleEnd(snapshotOf({ lampe: true }));

		manager.fallback();
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 0 });
		expect(get().hardwareLink.status).toBe("linked");
	});

	it("fallback is a no-op when not linked", async () => {
		const { manager, board } = setup();
		manager.fallback();
		await flush();
		expect(board.received).toEqual([]);
	});

	it("falls back when the page is hidden for good (pagehide)", async () => {
		const { manager, board } = setup();
		await manager.link();
		manager.onCycleEnd(snapshotOf({ lampe: true }));

		window.dispatchEvent(new Event("pagehide"));
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 0 });
		await manager.unlink();
	});

	it("stops reacting to pagehide once unlinked", async () => {
		const { manager, board } = setup();
		await manager.link();
		await manager.unlink();
		const frames = board.received.length;

		window.dispatchEvent(new Event("pagehide"));
		await flush();

		expect(board.received.length).toBe(frames);
	});
});

describe("HardwareLinkManager.unlink", () => {
	it("sends the fallback image, closes the port and clears the driven inputs", async () => {
		const { manager, get, board } = setup();
		await manager.link();
		manager.onCycleEnd(snapshotOf({ lampe: true }));

		await manager.unlink();

		expect(board.outImages().at(-1)).toEqual({ "13": 0 });
		expect(board.closed).toBe(true);
		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
	});

	it("is a no-op when disconnected", async () => {
		const { manager, board } = setup();
		await manager.unlink();
		expect(board.closed).toBe(false);
	});

	it("allows linking again afterwards", async () => {
		const { manager, get } = setup();
		await manager.link();
		await manager.unlink();
		await manager.link();
		expect(get().hardwareLink.status).toBe("linked");
	});
});

describe("HardwareLinkManager link loss", () => {
	it("resets the state and notifies when the board is unplugged", async () => {
		const { manager, get, board, notifier } = setup();
		await manager.link();

		board.unplug();
		await flush();

		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
		expect(notifier.linkLost).toHaveBeenCalledTimes(1);
	});
});

describe("HardwareLinkManager hidden tab", () => {
	const setVisibility = (state: "hidden" | "visible") => {
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			get: () => state,
		});
		document.dispatchEvent(new Event("visibilitychange"));
	};

	afterEach(() => setVisibility("visible"));

	it("cuts the outputs when the tab is hidden and ignores PLC cycles meanwhile", async () => {
		const { manager, board } = setup();
		await manager.link();
		manager.onCycleEnd(snapshotOf({ lampe: true }));

		setVisibility("hidden");
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0 });

		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 0 });
		await manager.unlink();
	});

	it("resumes the PLC outputs and tells the user when the tab is visible again", async () => {
		const { manager, board, notifier } = setup();
		await manager.link();
		setVisibility("hidden");

		setVisibility("visible");
		expect(notifier.outputsCutInBackground).toHaveBeenCalledTimes(1);

		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();
		expect(board.outImages().at(-1)).toEqual({ "13": 1 });
		await manager.unlink();
	});

	it("does not notify when the tab becomes visible without having been cut", async () => {
		const { manager, notifier } = setup();
		await manager.link();
		setVisibility("visible");
		expect(notifier.outputsCutInBackground).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("does not cut the outputs nor notify in Design mode", async () => {
		const { manager, set, board, notifier } = setup();
		set({ mode: ProjectMode.DESIGN });
		await manager.link();
		const frames = board.received.length;

		setVisibility("hidden");
		setVisibility("visible");
		await flush();

		expect(board.received.length).toBe(frames);
		expect(notifier.outputsCutInBackground).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("does not cut the outputs of a paused simulation", async () => {
		const { manager, set, board, notifier } = setup();
		set({ simulationPaused: true });
		await manager.link();
		const frames = board.received.length;

		setVisibility("hidden");
		setVisibility("visible");
		await flush();

		expect(board.received.length).toBe(frames);
		expect(notifier.outputsCutInBackground).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("does nothing when not linked, and stops listening once unlinked", async () => {
		const { manager, board, notifier } = setup();
		setVisibility("hidden");
		await manager.link();
		await manager.unlink();
		const frames = board.received.length;

		setVisibility("hidden");
		setVisibility("visible");
		await flush();

		expect(board.received.length).toBe(frames);
		expect(notifier.outputsCutInBackground).not.toHaveBeenCalled();
	});
});

describe("HardwareLinkManager firmware installation", () => {
	const uno = (
		app: ConstructorParameters<typeof FakeUnoBoard>[0],
		flashed: ConstructorParameters<typeof FakeUnoBoard>[1] = {
			firmware: "1.0.0",
		},
	) => new FakeUnoBoard(app, flashed);
	const phase = (get: () => ProjectStoreState) => get().hardwareFirmware.phase;
	const until = async (condition: () => boolean) => {
		for (let i = 0; i < 100 && !condition(); i++) await flush();
	};

	it("asks before installing when the board has no firmware, then links after the flash", async () => {
		const board = uno(null);
		const { manager, get, notifier } = setup({
			transport: board as never,
			minFirmwareVersion: "1.0.0",
		});

		const linking = manager.link();
		await until(() => phase(get) === "confirming");
		expect(get().hardwareFirmware).toEqual({
			phase: "confirming",
			reason: "missing",
			progress: null,
		});
		expect(board.bootloader.flash.size).toBe(0);

		manager.answerFirmwareInstall(true);
		await linking;

		expect(board.bootloader.flashBytes(256)).toEqual(
			Array.from(FIRMWARE_IMAGE),
		);
		expect(get().hardwareLink.status).toBe("linked");
		expect(get().hardwareFirmware).toEqual(IDLE_HARDWARE_FIRMWARE);
		expect(notifier.linked).toHaveBeenCalledTimes(1);
		expect(notifier.linkFailed).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("offers an update with the reason 'outdated' for an old firmware", async () => {
		const { manager, get } = setup({
			transport: uno({ firmware: "0.9.0" }) as never,
			minFirmwareVersion: "1.0.0",
		});
		const linking = manager.link();
		await until(() => phase(get) === "confirming");
		expect(get().hardwareFirmware.reason).toBe("outdated");

		manager.answerFirmwareInstall(true);
		await linking;
		expect(get().hardwareLink.status).toBe("linked");
		await manager.unlink();
	});

	it("offers an update for another protocol version", async () => {
		const { manager, get } = setup({
			transport: uno({ protocol: "2.0" }) as never,
			minFirmwareVersion: "1.0.0",
		});
		const linking = manager.link();
		await until(() => phase(get) === "confirming");
		expect(get().hardwareFirmware.reason).toBe("outdated");
		manager.answerFirmwareInstall(false);
		await linking;
	});

	it("leaves the board untouched and unlinked when the user declines", async () => {
		const board = uno(null);
		const { manager, get, notifier } = setup({ transport: board as never });
		const linking = manager.link();
		await until(() => phase(get) === "confirming");

		manager.answerFirmwareInstall(false);
		await linking;

		expect(board.bootloader.flash.size).toBe(0);
		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
		expect(get().hardwareFirmware).toEqual(IDLE_HARDWARE_FIRMWARE);
		expect(notifier.linkFailed).not.toHaveBeenCalled();
		expect(notifier.flashFailed).not.toHaveBeenCalled();
	});

	it("does not offer anything for a firmware that is up to date", async () => {
		const { manager, get } = setup({
			transport: uno({ firmware: "1.0.0" }) as never,
			minFirmwareVersion: "1.0.0",
		});
		await manager.link();
		expect(get().hardwareLink.status).toBe("linked");
		expect(phase(get)).toBe("idle");
		await manager.unlink();
	});

	it("reports a flash failure and stays unlinked", async () => {
		const board = new FakeUnoBoard(null, {}, { signature: [0, 0, 0] });
		const { manager, get, notifier } = setup({ transport: board as never });
		const linking = manager.link();
		await until(() => phase(get) === "confirming");

		manager.answerFirmwareInstall(true);
		await linking;

		expect(notifier.flashFailed).toHaveBeenCalledWith("unsupported-board");
		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
		expect(get().hardwareFirmware).toEqual(IDLE_HARDWARE_FIRMWARE);
	});

	it("reports a missing firmware file", async () => {
		const { manager, get, notifier } = setup({
			transport: uno(null) as never,
			firmwareFileError: true,
		});
		const linking = manager.link();
		await until(() => phase(get) === "confirming");

		manager.answerFirmwareInstall(true);
		await linking;

		expect(notifier.flashFailed).toHaveBeenCalledWith("firmware-unavailable");
		expect(get().hardwareLink.status).toBe("disconnected");
	});

	it("does not loop: a board still silent after the flash is an error", async () => {
		const board = uno(null, { firmwarePresent: false });
		const { manager, get, notifier } = setup({ transport: board as never });
		const linking = manager.link();
		await until(() => phase(get) === "confirming");

		manager.answerFirmwareInstall(true);
		await linking;

		expect(notifier.linkFailed).toHaveBeenCalledWith("handshake-timeout");
		expect(get().hardwareLink.status).toBe("disconnected");
		expect(get().hardwareFirmware.phase).toBe("idle");
	});

	it("abandons the dialog when unlinked meanwhile", async () => {
		const { manager, get } = setup({ transport: uno(null) as never });
		const linking = manager.link();
		await until(() => phase(get) === "confirming");

		await manager.unlink();
		await linking;

		expect(get().hardwareFirmware).toEqual(IDLE_HARDWARE_FIRMWARE);
		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
	});
});

describe("HardwareLinkManager.uploadProgram", () => {
	const linkedSetup = async (options: Parameters<typeof setup>[0] = {}) => {
		const context = setup({
			mode: ProjectMode.DESIGN,
			...options,
		});
		await context.manager.link();
		return context;
	};

	it("sends the program, keeps the link and notifies", async () => {
		const { manager, get, board, notifier } = await linkedSetup();

		await manager.uploadProgram();

		expect(board.program).not.toBeNull();
		expect(board.autonomous).toBe(true);
		expect(notifier.programUploaded).toHaveBeenCalled();
		expect(notifier.programUploadFailed).not.toHaveBeenCalled();
		expect(get().hardwareLink).toEqual({
			status: "linked",
			drivenInputIds: [],
			boardMode: "program-running",
			programPresent: true,
		});
		expect(get().hardwareUpload).toEqual(IDLE_HARDWARE_UPLOAD);
		expect(board.closed).toBe(false);
	});

	it("can send another program without linking again", async () => {
		const { manager, board, notifier } = await linkedSetup();
		await manager.uploadProgram();
		board.program = null;
		await manager.uploadProgram();
		expect(board.program).not.toBeNull();
		expect(notifier.programUploaded).toHaveBeenCalledTimes(2);
	});

	it("takes the pins back from the running program", async () => {
		const { manager, get, board } = await linkedSetup();
		await manager.uploadProgram();

		await manager.resumeRemoteIo();

		expect(board.autonomous).toBe(false);
		expect(get().hardwareLink).toEqual({
			status: "linked",
			drivenInputIds: ["bp"],
			boardMode: "remote-io",
			programPresent: true,
		});
	});

	it("does not drive the board from the simulation while it runs its program", async () => {
		const { manager, board, get } = await linkedSetup();
		await manager.uploadProgram();
		const frames = board.received.length;
		manager.onSimulationStart();
		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();
		expect(board.received.length).toBe(frames);
		expect(get().hardwareLink.drivenInputIds).toEqual([]);
	});

	it("resumeRemoteIo does nothing when no program runs", async () => {
		const { manager, board } = await linkedSetup();
		const frames = board.received.length;
		await manager.resumeRemoteIo();
		expect(board.received.length).toBe(frames);
	});

	it("wires the pins of the project into the program", async () => {
		const { manager, board } = await linkedSetup();
		await manager.uploadProgram();
		const image = board.program!;
		const ioCount = image[12];
		expect(ioCount).toBe(2);
		const entries = Array.from(image.subarray(26, 26 + 3 * ioCount));
		expect(entries.filter((_, i) => i % 3 === 2)).toEqual([2, 13]);
	});

	it("publishes that a transfer is in progress, then returns to idle", async () => {
		const { manager, get } = await linkedSetup();
		const upload = manager.uploadProgram();
		expect(get().hardwareUpload.phase).toBe("uploading");
		expect(get().hardwareUpload.totalBytes).toBeGreaterThan(0);
		await upload;
		expect(get().hardwareUpload).toEqual(IDLE_HARDWARE_UPLOAD);
	});

	it("does nothing while simulating", async () => {
		const { manager, board, notifier } = await linkedSetup({
			mode: ProjectMode.SIMULATION,
		});
		await manager.uploadProgram();
		expect(board.received.some((frame) => frame.command === "PROG_BEGIN")).toBe(
			false,
		);
		expect(notifier.programUploaded).not.toHaveBeenCalled();
	});

	it("does nothing when the board is not linked", async () => {
		const { manager, board, notifier } = setup({ mode: ProjectMode.DESIGN });
		await manager.uploadProgram();
		expect(board.opened).toBe(false);
		expect(notifier.programUploadFailed).not.toHaveBeenCalled();
	});

	it("refuses to send a project the analysis rejects", async () => {
		const { manager, board, notifier } = await linkedSetup({
			analysisOk: false,
		});
		await manager.uploadProgram();
		expect(notifier.programUploadFailed).toHaveBeenCalledWith("analysis");
		expect(board.received.some((frame) => frame.command === "PROG_BEGIN")).toBe(
			false,
		);
	});

	it("blocks a program that does not fit and names the limit", async () => {
		const { manager, board, notifier } = await linkedSetup();
		const descriptor = HardwareDeviceRegistry.get("arduino-uno-r3")!;
		const spy = jest.spyOn(HardwareDeviceRegistry, "get").mockReturnValue({
			...descriptor,
			limits: { ...descriptor.limits, programStorageBytes: 10 },
		});
		try {
			await manager.uploadProgram();
		} finally {
			spy.mockRestore();
		}
		expect(notifier.programBlocked).toHaveBeenCalledWith([
			expect.objectContaining({ code: "IMAGE_TOO_LARGE", limitBytes: 10 }),
		]);
		expect(board.received.some((frame) => frame.command === "PROG_BEGIN")).toBe(
			false,
		);
	});

	it("reports a refusal of the board and keeps the link", async () => {
		const { manager, get, notifier } = await linkedSetup({
			board: { rejectProgramEnd: "PROG_INVALID" },
		});
		await manager.uploadProgram();
		expect(notifier.programUploadFailed).toHaveBeenCalledWith(
			"upload-rejected",
		);
		expect(get().hardwareLink.status).toBe("linked");
		expect(get().hardwareUpload).toEqual(IDLE_HARDWARE_UPLOAD);
		expect(notifier.programUploaded).not.toHaveBeenCalled();
	});
});

describe("HardwareLinkManager program control", () => {
	const linkedWithProgram = async () => {
		const context = setup({ mode: ProjectMode.DESIGN });
		await context.manager.link();
		await context.manager.uploadProgram();
		return context;
	};

	it("learns from the board whether it holds a program, once linked", async () => {
		const { manager, get, board } = setup();
		await manager.link();
		expect(get().hardwareLink.programPresent).toBe(false);
		await manager.unlink();

		board.program = new Uint8Array(30);
		new DataView(board.program.buffer).setUint32(22, 0xabc, true);
		await manager.link();
		await flush();
		expect(get().hardwareLink.programPresent).toBe(true);
	});

	it("stops the program, then starts it again", async () => {
		const { manager, get, board } = await linkedWithProgram();

		await manager.stopProgram();
		expect(board.stopped).toBe(true);
		expect(get().hardwareLink).toMatchObject({
			boardMode: "program-stopped",
			drivenInputIds: [],
			programPresent: true,
		});

		await manager.runProgram();
		expect(board.autonomous).toBe(true);
		expect(get().hardwareLink.boardMode).toBe("program-running");
	});

	it("starts the stored program from remote I/O", async () => {
		const { manager, get, board } = await linkedWithProgram();
		await manager.resumeRemoteIo();
		expect(get().hardwareLink.boardMode).toBe("remote-io");

		await manager.runProgram();

		expect(board.autonomous).toBe(true);
		expect(get().hardwareLink).toMatchObject({
			boardMode: "program-running",
			drivenInputIds: [],
		});
	});

	it("takes the pins back from a stopped program", async () => {
		const { manager, get, board } = await linkedWithProgram();
		await manager.stopProgram();

		await manager.resumeRemoteIo();

		expect(board.stopped).toBe(false);
		expect(get().hardwareLink).toMatchObject({
			boardMode: "remote-io",
			drivenInputIds: ["bp"],
		});
	});

	it("does not drive the board from the simulation while its program is stopped", async () => {
		const { manager, board } = await linkedWithProgram();
		await manager.stopProgram();
		const frames = board.received.length;
		manager.onSimulationStart();
		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();
		expect(board.received.length).toBe(frames);
	});

	it("reports a board that has no program to start, and keeps remote I/O", async () => {
		const { manager, get, notifier } = setup();
		await manager.link();

		await manager.runProgram();

		expect(notifier.programCommandFailed).toHaveBeenCalledWith(
			"upload-rejected",
		);
		expect(get().hardwareLink.boardMode).toBe("remote-io");
	});

	it("does nothing when the board is not linked", async () => {
		const { manager, board, notifier } = setup();
		await manager.runProgram();
		await manager.stopProgram();
		expect(board.opened).toBe(false);
		expect(notifier.programCommandFailed).not.toHaveBeenCalled();
	});
});
