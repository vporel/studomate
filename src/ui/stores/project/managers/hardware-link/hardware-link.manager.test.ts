/** @jest-environment jsdom */
import { Dialect } from "@/expression-language/dialect.enum";
import RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import FakeRemoteIoBoard, {
	createManualHeartbeat,
} from "@tests/utils/fake-remote-io-board";
import GrafcetBuilder from "@/schemas/grafcet/builders/grafcet.builder";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import * as hardwareRegistry from "@/hardware/hardware-device.registry";
import type { ProjectStoreState } from "@/ui/stores/project/project.store";
import HardwareLinkManager from "./hardware-link.manager";
import {
	DISCONNECTED_HARDWARE_LINK,
	IDLE_HARDWARE_FIRMWARE,
	IDLE_HARDWARE_OBSERVATION,
	IDLE_HARDWARE_UPLOAD,
} from "./hardware-link.state";
import type { SerialTransport } from "@/hardware/arduino/remote-io/transport";
import FakeUnoBoard from "@tests/utils/fake-uno-board";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import type HardwareLinkNotifier from "./hardware-link.notifier";

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: any[]) => mockTrackEvent(...args),
}));

beforeEach(() => mockTrackEvent.mockClear());

const FIRMWARE_IMAGE = Uint8Array.from({ length: 256 }, (_, i) => i);

const flush = () => new Promise((r) => setTimeout(r, 0));

function stubNotifier(): jest.Mocked<HardwareLinkNotifier> {
	return {
		linked: jest.fn(),
		linkFailed: jest.fn(),
		linkLost: jest.fn(),
		flashFailed: jest.fn(),
		programUploaded: jest.fn(),
		programBlocked: jest.fn(),
		programUploadFailed: jest.fn(),
		programCommandFailed: jest.fn(),
		onlineFailed: jest.fn(),
		onlineLost: jest.fn(),
		boardVariableFailed: jest.fn(),
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
		/** The project holds a program the real analyser rejects. */
		invalidProject?: boolean;
	} = {},
) {
	VariableFactory.reset();
	const button = VariableFactory.createLogicInput("BP", "bp").update(
		{
			address: "%PD2",
		},
		Dialect.FR,
	);
	const lamp = VariableFactory.createLogicOutput("LAMPE", "lampe").update(
		{
			address: "%PD13",
		},
		Dialect.FR,
	);
	const project = ProjectFactory.create([button, lamp], []);
	if (options.withTarget !== false) {
		project.hardwareTarget = { modelId: "arduino-uno-r3" };
	}
	if (options.invalidProject) {
		project.addProgram(new GrafcetBuilder().id("g-empty").build());
	}

	let state = {
		project,
		mode: options.mode ?? ProjectMode.SIMULATION,
		simulationKind:
			(options.mode ?? ProjectMode.SIMULATION) === ProjectMode.SIMULATION
				? "hardware-io"
				: "virtual",
		simulationPaused: false,
		hardwareLink: DISCONNECTED_HARDWARE_LINK,
		hardwareFirmware: IDLE_HARDWARE_FIRMWARE,
		hardwareUpload: IDLE_HARDWARE_UPLOAD,
		hardwareObservation: IDLE_HARDWARE_OBSERVATION,
		plcConfig: { scanTimeMs: 100 },
		simulationManager: {
			applyExternalInputs: jest.fn(),
			startOnline: jest.fn(),
			publishBoardSnapshot: jest.fn(),
			setDesignMode: jest.fn(),
			setSimulationKind: jest.fn(),
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
	const uploadPhases: string[] = [];
	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		if (patch.hardwareUpload) uploadPhases.push(patch.hardwareUpload.phase);
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
		{ postFlashDelayMs: 0, onlinePollMs: 15 },
	);
	return {
		manager,
		get,
		set,
		board,
		heartbeat,
		notifier,
		project,
		uploadPhases,
	};
}

const snapshotOf = (values: Record<string, boolean | number>) =>
	Object.entries(values).map(
		([id, value]) =>
			({ getId: () => id, getValue: () => value }) as unknown as PLCVariable,
	);

describe("HardwareLinkManager.link", () => {
	it("opens the link without touching the board, and notifies", async () => {
		const { manager, get, board, notifier } = setup({
			mode: ProjectMode.DESIGN,
		});

		await manager.link();

		expect(get().hardwareLink).toMatchObject({
			status: "linked",
			drivenInputIds: [],
			boardMode: "idle",
		});
		expect(notifier.linked).toHaveBeenCalled();
		expect(board.received.map((frame) => frame.command)).not.toContain("CFG");
	});

	it("learns what the board holds and runs, once linked", async () => {
		const { manager, get, board } = setup({ mode: ProjectMode.DESIGN });
		board.program = new Uint8Array(30);
		new DataView(board.program.buffer).setUint32(22, 0xabc, true);
		board.autonomous = true;

		await manager.link();

		expect(get().hardwareLink).toMatchObject({
			boardMode: "program-running",
			programPresent: true,
		});
		await manager.unlink();
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

	it("keeps open for good a link a transfer or a mode had opened, once the user asks for it", async () => {
		const { manager, get, set } = setup({ mode: ProjectMode.DESIGN });
		await manager.ensureLink("mode");
		await manager.link();

		set({ simulationKind: "virtual" });
		await manager.onModeSettled();

		expect(get().hardwareLink.status).toBe("linked");
		await manager.unlink();
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

	it("opens one link for two requests made while it is opening", async () => {
		const { manager, board } = setup({ mode: ProjectMode.DESIGN });
		const [first, second] = await Promise.all([
			manager.ensureLink("mode"),
			manager.ensureLink("upload"),
		]);
		expect([first, second]).toEqual([true, true]);
		expect(
			board.received.filter((frame) => frame.command === "PING").length,
		).toBeGreaterThan(0);
		await manager.unlink();
	});
});

describe("HardwareLinkManager.enterHardwareIo", () => {
	it("opens the link if needed and has the board serve its pins", async () => {
		const { manager, get, board } = setup();

		await expect(manager.enterHardwareIo()).resolves.toBe(true);

		expect(get().hardwareLink).toMatchObject({
			status: "linked",
			drivenInputIds: ["bp"],
			boardMode: "remote-io",
		});
		const cfg = board.received.find((frame) => frame.command === "CFG");
		expect(cfg?.args).toEqual(["2:IP", "13:O"]);
	});

	it("does not announce a link the user did not ask for", async () => {
		const { manager, notifier } = setup();
		await manager.enterHardwareIo();
		expect(notifier.linked).not.toHaveBeenCalled();
	});

	it("stops the program the board was running", async () => {
		const { manager, board } = setup();
		board.autonomous = true;
		await manager.enterHardwareIo();
		expect(board.autonomous).toBe(false);
	});

	it("serves the pins of a link the user already opened", async () => {
		const { manager, get } = setup();
		await manager.link();
		await manager.enterHardwareIo();
		expect(get().hardwareLink.boardMode).toBe("remote-io");
	});

	it("is true when the board already serves its pins, without configuring it again", async () => {
		const { manager, board } = setup();
		await manager.enterHardwareIo();
		const frames = board.received.length;
		await expect(manager.enterHardwareIo()).resolves.toBe(true);
		expect(board.received.length).toBe(frames);
	});

	it("fails without a hardware target", async () => {
		const { manager, board } = setup({ withTarget: false });
		await expect(manager.enterHardwareIo()).resolves.toBe(false);
		expect(board.opened).toBe(false);
	});

	it("leaves the board neutral when the simulation could not start", async () => {
		const { manager, get, board } = setup();
		await manager.enterHardwareIo();

		await manager.leaveHardwareIo();

		expect(get().hardwareLink).toMatchObject({
			boardMode: "idle",
			drivenInputIds: [],
		});
		expect(
			board.received.filter((frame) => frame.command === "CFG").at(-1)?.args,
		).toEqual([]);
	});
});

describe("HardwareLinkManager mode transitions", () => {
	it("leaves the pins when a simulation with the real I/O stops", async () => {
		const { manager, get, board } = setup();
		await manager.enterHardwareIo();
		manager.onCycleEnd(snapshotOf({ lampe: true }));

		await manager.onSimulationStop();

		expect(board.outImages().at(-1)).toEqual({ "13": 0 });
		expect(get().hardwareLink.boardMode).toBe("idle");
	});

	it("closes a link a mode opened once the mode in place does not need the board", async () => {
		const { manager, get, set, board } = setup();
		await manager.enterHardwareIo();
		await manager.onModeSettled();
		expect(get().hardwareLink.status).toBe("linked");

		set({ mode: ProjectMode.DESIGN, simulationKind: "virtual" });
		await manager.onSimulationStop();
		await manager.onModeSettled();

		expect(get().hardwareLink.status).toBe("disconnected");
		expect(board.closed).toBe(true);
	});

	it("keeps a link the user opened when the mode ends", async () => {
		const { manager, get, set } = setup();
		await manager.link();
		await manager.enterHardwareIo();

		set({ mode: ProjectMode.DESIGN, simulationKind: "virtual" });
		await manager.onSimulationStop();
		await manager.onModeSettled();

		expect(get().hardwareLink.status).toBe("linked");
		await manager.unlink();
	});

	it("keeps a link a mode opened while the mode in place still needs the board", async () => {
		const { manager, get } = setup();
		await manager.enterHardwareIo();
		await manager.onModeSettled();
		expect(get().hardwareLink.status).toBe("linked");
		await manager.unlink();
	});
});

describe("HardwareLinkManager inputs", () => {
	it("forwards changed pin values to the simulation, without repeating unchanged ones", async () => {
		const { manager, get, board } = setup();
		await manager.enterHardwareIo();
		const apply = get().simulationManager.applyExternalInputs as jest.Mock;

		board.emitInputs({ "2": 0 });
		board.emitInputs({ "2": 0 });
		board.emitInputs({ "2": 1 });

		expect(apply).toHaveBeenCalledTimes(2);
		expect(Object.fromEntries(apply.mock.calls[0][0])).toEqual({ bp: true });
		expect(Object.fromEntries(apply.mock.calls[1][0])).toEqual({ bp: false });
	});

	it("replays the latest pin values when a simulation starts", async () => {
		const { manager, get, board } = setup();
		await manager.enterHardwareIo();
		board.emitInputs({ "2": 0 });
		const apply = get().simulationManager.applyExternalInputs as jest.Mock;
		apply.mockClear();

		manager.onSimulationStart();

		expect(apply).toHaveBeenCalledTimes(1);
		expect(Object.fromEntries(apply.mock.calls[0][0])).toEqual({ bp: true });
	});

	it("does nothing at simulation start when not linked", () => {
		const { manager, get } = setup();
		manager.onSimulationStart();
		expect(get().simulationManager.applyExternalInputs).not.toHaveBeenCalled();
	});

	it("reconfigures the board at simulation start when the project changed", async () => {
		const { manager, get, set, board, project } = setup();
		await manager.enterHardwareIo();

		const extra = VariableFactory.createLogicInput("BP2", "bp2").update(
			{
				address: "%PD3",
			},
			Dialect.FR,
		);
		const changed = project.copy();
		changed.variables = [...project.variables, extra];
		set({ project: changed });
		manager.onSimulationStart();
		await flush();

		const configs = board.received.filter((frame) => frame.command === "CFG");
		expect(configs.at(-1)?.args).toEqual(["2:IP", "13:O", "3:IP"]);
		expect(get().hardwareLink.drivenInputIds).toEqual(["bp", "bp2"]);
	});

	describe("when the board refuses the new configuration at simulation start", () => {
		const changeProject = (
			set: (partial: any) => void,
			project: ReturnType<typeof setup>["project"],
		) => {
			const extra = VariableFactory.createLogicInput("BP2", "bp2").update(
				{ address: "%PD3" },
				Dialect.FR,
			);
			const changed = project.copy();
			changed.variables = [...project.variables, extra];
			set({ project: changed });
		};
		const restrictPins = (board: FakeRemoteIoBoard) => {
			(
				board as unknown as { options: { knownPins: string[] } }
			).options.knownPins = ["2", "13"];
		};

		it("unlinks and notifies the failure", async () => {
			const { manager, get, set, board, project, notifier } = setup();
			await manager.enterHardwareIo();
			restrictPins(board);
			changeProject(set, project);

			manager.onSimulationStart();
			await flush();

			expect(get().hardwareLink.status).toBe("disconnected");
			expect(board.closed).toBe(true);
			expect(notifier.linkFailed).toHaveBeenCalledTimes(1);
		});

		it("ignores a late refusal once the link was replaced", async () => {
			const { manager, get, set, board, project, notifier } = setup();
			await manager.enterHardwareIo();
			restrictPins(board);
			changeProject(set, project);
			const target = board as unknown as { answer: (frame: unknown) => void };
			const original = target.answer.bind(board);
			const held: Array<() => void> = [];
			target.answer = (frame) => {
				if ((frame as { command: string }).command === "CFG") {
					held.push(() => original(frame));
				} else {
					original(frame);
				}
			};

			manager.onSimulationStart();
			await flush();
			await manager.unlink();
			target.answer = original;
			set({ project });
			await manager.enterHardwareIo();
			held.splice(0).forEach((answer) => answer());
			await flush();

			expect(get().hardwareLink.status).toBe("linked");
			expect(notifier.linkFailed).not.toHaveBeenCalled();
		});
	});

	it("does not resend the configuration when the plan is unchanged", async () => {
		const { manager, board } = setup();
		await manager.enterHardwareIo();
		const before = board.received.filter((f) => f.command === "CFG").length;

		manager.onSimulationStart();
		await flush();

		expect(board.received.filter((f) => f.command === "CFG").length).toBe(
			before,
		);
	});

	it("unlinks at simulation start when the target was removed", async () => {
		const { manager, get, set, project, board } = setup();
		await manager.enterHardwareIo();
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
		await manager.enterHardwareIo();

		manager.onCycleEnd(snapshotOf({ lampe: true, bp: true, autre: 5 }));
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 1 });
	});

	it("sends one OUT frame for several cycles with identical outputs", async () => {
		const { manager, board } = setup();
		await manager.enterHardwareIo();
		await flush();
		const before = board.outImages().length;

		manager.onCycleEnd(snapshotOf({ lampe: true }));
		manager.onCycleEnd(snapshotOf({ lampe: true }));
		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();

		expect(board.outImages().length).toBe(before + 1);
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
		await manager.enterHardwareIo();
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
		await manager.enterHardwareIo();
		manager.onCycleEnd(snapshotOf({ lampe: true }));

		window.dispatchEvent(new Event("pagehide"));
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 0 });
		await manager.unlink();
	});

	it("stops reacting to pagehide once unlinked", async () => {
		const { manager, board } = setup();
		await manager.enterHardwareIo();
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
		await manager.enterHardwareIo();
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
		await manager.enterHardwareIo();
		await manager.unlink();
		await manager.enterHardwareIo();
		expect(get().hardwareLink.status).toBe("linked");
	});
});

describe("HardwareLinkManager link loss", () => {
	it("carries a simulation with the real I/O on with virtual inputs", async () => {
		const { manager, get, board } = setup();
		await manager.enterHardwareIo();

		board.unplug();
		await flush();

		expect(
			get().simulationManager.setSimulationKind as jest.Mock,
		).toHaveBeenCalledWith("virtual");
		expect(
			get().simulationManager.setDesignMode as jest.Mock,
		).not.toHaveBeenCalled();
	});

	it("does not touch the simulation when nothing used the board", async () => {
		const { manager, get, board } = setup({ mode: ProjectMode.DESIGN });
		await manager.link();

		board.unplug();
		await flush();

		expect(
			get().simulationManager.setSimulationKind as jest.Mock,
		).not.toHaveBeenCalled();
	});

	it("resets the state and notifies when the board is unplugged", async () => {
		const { manager, get, board, notifier } = setup();
		await manager.enterHardwareIo();

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

	it("keeps writing the PLC outputs while the tab is hidden", async () => {
		const { manager, board } = setup();
		await manager.enterHardwareIo();

		setVisibility("hidden");
		manager.onCycleEnd(snapshotOf({ lampe: true }));
		await flush();

		expect(board.outImages().at(-1)).toEqual({ "13": 1 });
		await manager.unlink();
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

	it("loads the program, keeps the link the user opened and notifies", async () => {
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

	it("opens a link for the transfer when there is none, and closes it after", async () => {
		const { manager, get, board, notifier } = setup({
			mode: ProjectMode.DESIGN,
		});

		await manager.uploadProgram();

		expect(board.program).not.toBeNull();
		expect(board.autonomous).toBe(true);
		expect(notifier.programUploaded).toHaveBeenCalled();
		expect(notifier.linked).not.toHaveBeenCalled();
		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
		expect(board.closed).toBe(true);
	});

	it("closes the temporary link when the transfer fails, and says so", async () => {
		const { manager, get, board, notifier } = setup({
			mode: ProjectMode.DESIGN,
			board: { rejectProgramEnd: "PROG_INVALID" },
		});

		await manager.uploadProgram();

		expect(notifier.programUploadFailed).toHaveBeenCalledWith(
			"exchange-rejected",
		);
		expect(get().hardwareLink.status).toBe("disconnected");
		expect(board.closed).toBe(true);
	});

	it("does not configure the pins of the board for a transfer", async () => {
		const { manager, board } = setup({ mode: ProjectMode.DESIGN });
		await manager.uploadProgram();
		expect(board.received.map((frame) => frame.command)).not.toContain("CFG");
	});

	it("can load another program without linking again", async () => {
		const { manager, board, notifier } = await linkedSetup();
		await manager.uploadProgram();
		board.program = null;
		await manager.uploadProgram();
		expect(board.program).not.toBeNull();
		expect(notifier.programUploaded).toHaveBeenCalledTimes(2);
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
		const { manager, get, uploadPhases } = await linkedSetup();
		await manager.uploadProgram();
		expect(uploadPhases[0]).toBe("uploading");
		expect(uploadPhases.at(-1)).toBe("idle");
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

	it("does nothing without a hardware target", async () => {
		const { manager, board, notifier } = setup({
			mode: ProjectMode.DESIGN,
			withTarget: false,
		});
		await manager.uploadProgram();
		expect(board.opened).toBe(false);
		expect(notifier.programUploadFailed).not.toHaveBeenCalled();
	});

	it("refuses to load a project the analysis rejects, without opening a link", async () => {
		const { manager, board, notifier } = setup({
			mode: ProjectMode.DESIGN,
			analysisOk: false,
		});
		await manager.uploadProgram();
		expect(notifier.programUploadFailed).toHaveBeenCalledWith("analysis");
		expect(board.opened).toBe(false);
	});

	it("blocks a program that does not fit and names the limit, without opening a link", async () => {
		const { manager, board, notifier } = setup({ mode: ProjectMode.DESIGN });
		const descriptor = hardwareRegistry.getHardwareDevice("arduino-uno-r3")!;
		const spy = jest
			.spyOn(hardwareRegistry, "getHardwareDevice")
			.mockReturnValue({
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
		expect(board.opened).toBe(false);
	});

	it("reports a refusal of the board and keeps the link the user opened", async () => {
		const { manager, get, notifier } = await linkedSetup({
			board: { rejectProgramEnd: "PROG_INVALID" },
		});
		await manager.uploadProgram();
		expect(notifier.programUploadFailed).toHaveBeenCalledWith(
			"exchange-rejected",
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

	it("starts the stored program from an idle board", async () => {
		const { manager, get, board } = setup({ mode: ProjectMode.DESIGN });
		board.program = new Uint8Array(30);
		new DataView(board.program.buffer).setUint32(22, 0xabc, true);
		await manager.link();
		expect(get().hardwareLink).toMatchObject({
			boardMode: "idle",
			programPresent: true,
		});

		await manager.runProgram();

		expect(board.autonomous).toBe(true);
		expect(get().hardwareLink.boardMode).toBe("program-running");
		await manager.unlink();
	});

	it("starts the program after the board served its pins to a simulation", async () => {
		const { manager, get, board } = setup();
		await manager.link();
		board.program = new Uint8Array(30);
		new DataView(board.program.buffer).setUint32(22, 0xabc, true);
		await manager.enterHardwareIo();

		await manager.runProgram();

		expect(board.autonomous).toBe(true);
		expect(get().hardwareLink).toMatchObject({
			boardMode: "program-running",
			drivenInputIds: [],
		});
		await manager.unlink();
	});

	it("serves the pins of a board whose program was stopped", async () => {
		const { manager, get, board } = await linkedWithProgram();
		await manager.stopProgram();

		await manager.enterHardwareIo();

		expect(board.stopped).toBe(false);
		expect(get().hardwareLink).toMatchObject({
			boardMode: "remote-io",
			drivenInputIds: ["bp"],
		});
		await manager.unlink();
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

	it("reports a board that has no program to start", async () => {
		const { manager, get, notifier } = setup({ mode: ProjectMode.DESIGN });
		await manager.link();

		await manager.runProgram();

		expect(notifier.programCommandFailed).toHaveBeenCalledWith(
			"exchange-rejected",
		);
		expect(get().hardwareLink.boardMode).toBe("idle");
	});

	it("does nothing when the board is not linked", async () => {
		const { manager, board, notifier } = setup();
		await manager.runProgram();
		await manager.stopProgram();
		expect(board.opened).toBe(false);
		expect(notifier.programCommandFailed).not.toHaveBeenCalled();
	});
});

describe("HardwareLinkManager online mode", () => {
	const flushLong = (ms: number) => new Promise((r) => setTimeout(r, ms));

	const linkedWithProgram = async (
		options: Parameters<typeof setup>[0] = {},
	) => {
		const context = setup({ mode: ProjectMode.DESIGN, ...options });
		await context.manager.link();
		await context.manager.uploadProgram();
		return context;
	};
	const simulationOf = (get: () => ProjectStoreState) =>
		get().simulationManager as unknown as {
			startOnline: jest.Mock;
			publishBoardSnapshot: jest.Mock;
			setDesignMode: jest.Mock;
		};
	/** Bytes of variable memory and tag of the image the fake board holds. */
	const imageOf = (program: Uint8Array) => ({
		size: program[8] + 2 * (program[9] + program[10]) + 4 * program[11],
		tag: program[22] | (program[23] << 8),
	});

	it("follows the program of the board and shows what it reports", async () => {
		const { manager, get, board, notifier } = await linkedWithProgram();

		await manager.goOnline();

		expect(notifier.onlineFailed).not.toHaveBeenCalled();
		expect(simulationOf(get).startOnline).toHaveBeenCalledTimes(1);
		expect(board.watching).toBe(true);
		expect(get().hardwareLink).toMatchObject({
			boardMode: "program-running",
			drivenInputIds: ["bp"],
		});

		const { size, tag } = imageOf(board.program!);
		board.emitTelemetry(new Uint8Array(size).fill(1), { cycle: 3, tag });
		expect(simulationOf(get).publishBoardSnapshot).toHaveBeenCalledWith({
			BP: true,
			LAMPE: true,
		});
		await manager.unlink();
	});

	it("does not track the online mode when the user declines to start the program", async () => {
		const { manager } = await linkedWithProgram();
		await manager.stopProgram();
		const online = manager.goOnline();
		await flush();
		manager.answerObservationStart(false);
		await online;
		expect(mockTrackEvent).not.toHaveBeenCalledWith(
			"hardware-mode-entered",
			expect.anything(),
		);
	});

	it("tracks the online mode when the observation began", async () => {
		const { manager } = await linkedWithProgram();
		await manager.goOnline();
		expect(mockTrackEvent).toHaveBeenCalledWith("hardware-mode-entered", {
			mode: "online",
		});
		await manager.unlink();
	});

	it("asks before starting a stopped program, then starts it and observes it", async () => {
		const { manager, get, board } = await linkedWithProgram();
		await manager.stopProgram();
		expect(board.autonomous).toBe(false);

		const online = manager.goOnline();
		await flush();
		expect(get().hardwareObservation.phase).toBe("confirming");
		manager.answerObservationStart(true);

		await expect(online).resolves.toBe(true);
		expect(get().hardwareObservation).toEqual(IDLE_HARDWARE_OBSERVATION);
		expect(board.autonomous).toBe(true);
		expect(board.watching).toBe(true);
		expect(simulationOf(get).startOnline).toHaveBeenCalledTimes(1);
		await manager.unlink();
	});

	it("leaves the board alone and observes nothing when the user declines to start it", async () => {
		const { manager, get, board } = await linkedWithProgram();
		await manager.stopProgram();

		const online = manager.goOnline();
		await flush();
		manager.answerObservationStart(false);

		await expect(online).resolves.toBe(false);
		expect(get().hardwareObservation).toEqual(IDLE_HARDWARE_OBSERVATION);
		expect(board.autonomous).toBe(false);
		expect(board.watching).toBe(false);
		expect(simulationOf(get).startOnline).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("abandons the question when the link is closed meanwhile", async () => {
		const { manager, get } = await linkedWithProgram();
		await manager.stopProgram();

		const online = manager.goOnline();
		await flush();
		await manager.unlink();

		await expect(online).resolves.toBe(false);
		expect(get().hardwareObservation).toEqual(IDLE_HARDWARE_OBSERVATION);
	});

	it("does not ask, nor restart anything, when the program already runs", async () => {
		const { manager, get, board } = await linkedWithProgram();
		await expect(manager.goOnline()).resolves.toBe(true);
		expect(get().hardwareObservation.phase).toBe("idle");
		expect(board.received.some((frame) => frame.command === "PROG_RUN")).toBe(
			false,
		);
		await manager.unlink();
	});

	it("compares the program without opening the analysis panel", async () => {
		const { manager, get } = await linkedWithProgram();
		await manager.goOnline();
		expect(get().simulationManager.analyze).toHaveBeenCalledTimes(1); // the one of the upload
		await manager.unlink();
	});

	it("opens the link itself, and closes it when the mode ends", async () => {
		const { manager, get, set, board } = setup({ mode: ProjectMode.DESIGN });
		await manager.uploadProgram();
		expect(get().hardwareLink.status).toBe("disconnected");

		await expect(manager.goOnline()).resolves.toBe(true);
		expect(get().hardwareLink.status).toBe("linked");
		expect(board.watching).toBe(true);

		set({ mode: ProjectMode.DESIGN, simulationKind: "observation" });
		await manager.onSimulationStop();
		set({ simulationKind: "virtual" });
		await manager.onModeSettled();

		expect(get().hardwareLink.status).toBe("disconnected");
		expect(board.closed).toBe(true);
	});

	it("refuses when the board holds no program", async () => {
		const { manager, get, notifier } = setup({ mode: ProjectMode.DESIGN });
		await expect(manager.goOnline()).resolves.toBe(false);
		expect(notifier.onlineFailed).toHaveBeenCalledWith("no-program");
		expect(simulationOf(get).startOnline).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("refuses when the board holds another program than the project", async () => {
		const { manager, get, board, notifier } = await linkedWithProgram();
		board.program = Uint8Array.from(board.program!);
		board.program[22] ^= 0xff;
		await expect(manager.goOnline()).resolves.toBe(false);
		expect(notifier.onlineFailed).toHaveBeenCalledWith("program-differs");
		expect(simulationOf(get).startOnline).not.toHaveBeenCalled();
		expect(board.watching).toBe(false);
	});

	it("refuses a project the analysis rejects, without touching the board", async () => {
		const { manager, get, board, notifier } = setup({
			mode: ProjectMode.DESIGN,
			invalidProject: true,
		});
		await expect(manager.goOnline()).resolves.toBe(false);
		expect(notifier.onlineFailed).toHaveBeenCalledWith("analysis");
		expect(simulationOf(get).startOnline).not.toHaveBeenCalled();
		expect(board.opened).toBe(false);
	});

	it("can start from any mode, not only Design", async () => {
		const context = await linkedWithProgram();
		context.set({ mode: ProjectMode.SIMULATION, simulationKind: "virtual" });
		await expect(context.manager.goOnline()).resolves.toBe(true);
		await context.manager.unlink();
	});

	it("does nothing without a hardware target", async () => {
		const { manager, board, notifier } = setup({ withTarget: false });
		await expect(manager.goOnline()).resolves.toBe(false);
		expect(board.opened).toBe(false);
		expect(notifier.onlineFailed).not.toHaveBeenCalled();
	});

	it("stops observing without stopping the program", async () => {
		const { manager, get, set, board } = await linkedWithProgram();
		await manager.goOnline();
		set({ simulationKind: "observation" });

		await manager.onSimulationStop();

		expect(board.watching).toBe(false);
		expect(board.autonomous).toBe(true);
		expect(get().hardwareLink.drivenInputIds).toEqual([]);
		await manager.unlink();
	});

	it("leaves the online mode when the link is closed", async () => {
		const { manager, get } = await linkedWithProgram();
		await manager.goOnline();

		await manager.unlink();

		expect(simulationOf(get).setDesignMode).toHaveBeenCalledTimes(1);
	});

	it("leaves the online mode and says why when the board reports a fault", async () => {
		const { manager, get, board, notifier } = await linkedWithProgram();
		await manager.goOnline();

		board.fault = 1;
		await flushLong(60);

		expect(notifier.onlineLost).toHaveBeenCalledWith("board-fault", 1);
		expect(simulationOf(get).setDesignMode).toHaveBeenCalled();
		await manager.unlink();
	});

	it("leaves the online mode when the program of the board is stopped", async () => {
		const { manager, board, notifier } = await linkedWithProgram();
		await manager.goOnline();

		board.autonomous = false;
		board.stopped = true;
		await flushLong(60);

		expect(notifier.onlineLost).toHaveBeenCalledWith("board-stopped", 0);
		await manager.unlink();
	});

	it("leaves the online mode when the board reports another program", async () => {
		const { manager, get, board, notifier } = await linkedWithProgram();
		await manager.goOnline();
		const { size } = imageOf(board.program!);

		board.emitTelemetry(new Uint8Array(size), { cycle: 1, tag: 0x0001 });

		expect(notifier.onlineLost).toHaveBeenCalledWith("program-differs", 0);
		expect(simulationOf(get).setDesignMode).toHaveBeenCalled();
		await manager.unlink();
	});

	it("writes, forces and releases variables of the followed program", async () => {
		const { manager, board, notifier } = await linkedWithProgram();
		await manager.goOnline();

		await manager.writeBoardVariable("LAMPE", true);
		await manager.forceBoardVariable("BP", true);
		await manager.forceBoardVariable("LAMPE", 3);
		await manager.releaseBoardVariable("LAMPE");

		// BP is variable 0 and LAMPE variable 1 of the image.
		expect(board.written.get(1)).toBe(1);
		expect([...board.forced]).toEqual([[0, 1]]);
		expect(notifier.boardVariableFailed).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("releases what was forced when it stops following the program", async () => {
		const { manager, set, board } = await linkedWithProgram();
		await manager.goOnline();
		await manager.forceBoardVariable("BP", true);

		set({ simulationKind: "observation" });
		await manager.onSimulationStop();

		expect(board.forced.size).toBe(0);
		await manager.unlink();
	});

	it("leaves out a variable the program does not use", async () => {
		const { manager, board, notifier } = await linkedWithProgram();
		await manager.goOnline();
		await manager.writeBoardVariable("unknown", 1);
		expect(board.written.size).toBe(0);
		expect(notifier.boardVariableFailed).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("reports a write the board refuses", async () => {
		const { manager, board, notifier } = await linkedWithProgram();
		await manager.goOnline();
		board.autonomous = false;
		await manager.writeBoardVariable("LAMPE", true);
		expect(notifier.boardVariableFailed).toHaveBeenCalledWith(
			"exchange-rejected",
		);
		await manager.unlink();
	});

	it("writes nothing when the program of the board is not followed", async () => {
		const { manager, board, notifier } = await linkedWithProgram();
		await manager.writeBoardVariable("LAMPE", true);
		await manager.forceBoardVariable("LAMPE", true);
		expect(board.written.size + board.forced.size).toBe(0);
		expect(notifier.boardVariableFailed).not.toHaveBeenCalled();
		await manager.unlink();
	});

	it("keeps quiet while the board runs its program", async () => {
		const { manager, notifier } = await linkedWithProgram();
		await manager.goOnline();
		await flushLong(60);
		expect(notifier.onlineLost).not.toHaveBeenCalled();
		await manager.unlink();
	});
});

describe("HardwareLinkManager analytics", () => {
	it("tracks the link with the model of the board", async () => {
		const { manager } = setup({ mode: ProjectMode.DESIGN });
		await manager.link();
		expect(mockTrackEvent).toHaveBeenCalledWith("hardware-linked", {
			model: "arduino-uno-r3",
		});
		await manager.unlink();
	});

	it("tracks a link failure with a closed reason, never the raw message", async () => {
		const { manager } = setup({
			createClientError: new Error("denied: /dev/x"),
		});
		await manager.link();
		expect(mockTrackEvent).toHaveBeenCalledWith("hardware-link-failed", {
			reason: "transport",
		});
		expect(mockTrackEvent).not.toHaveBeenCalledWith(
			"hardware-linked",
			expect.anything(),
		);
	});

	it("tracks nothing when the user dismisses the port chooser", async () => {
		const { manager } = setup({
			createClientError: new DOMException("none chosen", "NotFoundError"),
		});
		await manager.link();
		expect(mockTrackEvent).not.toHaveBeenCalled();
	});

	it("tracks the I/O mode once the board serves its pins", async () => {
		const { manager } = setup();
		await manager.enterHardwareIo();
		expect(mockTrackEvent).toHaveBeenCalledWith("hardware-mode-entered", {
			mode: "io",
		});
		await manager.unlink();
	});

	it("does not track the I/O mode without a hardware target", async () => {
		const { manager } = setup({ withTarget: false });
		await manager.enterHardwareIo();
		expect(mockTrackEvent).not.toHaveBeenCalledWith(
			"hardware-mode-entered",
			expect.anything(),
		);
	});

	describe("firmware installation", () => {
		const until = async (condition: () => boolean) => {
			for (let i = 0; i < 100 && !condition(); i++) await flush();
		};

		it("tracks an accepted installation", async () => {
			const { manager, get } = setup({
				transport: new FakeUnoBoard(null, { firmware: "1.0.0" }) as never,
				minFirmwareVersion: "1.0.0",
			});
			const linking = manager.link();
			await until(() => get().hardwareFirmware.phase === "confirming");
			manager.answerFirmwareInstall(true);
			await linking;
			expect(mockTrackEvent).toHaveBeenCalledWith("firmware-installed", {
				outcome: "installed",
			});
			await manager.unlink();
		});

		it("tracks a declined installation", async () => {
			const { manager, get } = setup({
				transport: new FakeUnoBoard(null, { firmware: "1.0.0" }) as never,
			});
			const linking = manager.link();
			await until(() => get().hardwareFirmware.phase === "confirming");
			manager.answerFirmwareInstall(false);
			await linking;
			expect(mockTrackEvent).toHaveBeenCalledWith("firmware-installed", {
				outcome: "declined",
			});
		});

		it("tracks a failed installation", async () => {
			const { manager, get } = setup({
				transport: new FakeUnoBoard(
					null,
					{},
					{ signature: [0, 0, 0] },
				) as never,
			});
			const linking = manager.link();
			await until(() => get().hardwareFirmware.phase === "confirming");
			manager.answerFirmwareInstall(true);
			await linking;
			expect(mockTrackEvent).toHaveBeenCalledWith("firmware-installed", {
				outcome: "failed",
			});
		});
	});

	it("tracks a successful program upload", async () => {
		const { manager } = setup({ mode: ProjectMode.DESIGN });
		await manager.link();
		await manager.uploadProgram();
		expect(mockTrackEvent).toHaveBeenCalledWith("board-program-uploaded", {
			result: "ok",
		});
		await manager.unlink();
	});
});
