/** @jest-environment jsdom */
import RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type PLCVariable from "@/simulator/core/plc/plc-variable";
import FakeRemoteIoBoard, {
	createManualHeartbeat,
} from "@tests/utils/fake-remote-io-board";
import { ProjectFactory } from "@tests/utils/project-factory";
import { VariableFactory } from "@tests/utils/variable-factory";
import type { ProjectStoreState } from "@/ui/stores/project/project.store";
import HardwareLinkManager, {
	DISCONNECTED_HARDWARE_LINK,
} from "./hardware-link.manager";
import type HardwareLinkNotifier from "./hardware-link.notifier";

const flush = () => new Promise((r) => setTimeout(r, 0));

function stubNotifier(): jest.Mocked<HardwareLinkNotifier> {
	return {
		linked: jest.fn(),
		linkFailed: jest.fn(),
		linkLost: jest.fn(),
		outputsCutInBackground: jest.fn(),
	};
}

function setup(
	options: {
		board?: ConstructorParameters<typeof FakeRemoteIoBoard>[0];
		createClientError?: unknown;
		withTarget?: boolean;
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
		hardwareLink: DISCONNECTED_HARDWARE_LINK,
		simulationManager: { applyHardwareInputs: jest.fn() },
	} as unknown as ProjectStoreState;
	const set = (partial: any) => {
		const patch = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...patch } as ProjectStoreState;
	};
	const get = () => state;

	const board = new FakeRemoteIoBoard(options.board);
	const heartbeat = createManualHeartbeat();
	const notifier = stubNotifier();
	const manager = new HardwareLinkManager(set, get, notifier, async (plan) => {
		if (options.createClientError) throw options.createClientError;
		return new RemoteIoClient({
			transport: board,
			plan,
			heartbeat: heartbeat.scheduler,
			handshakeTimeoutMs: 80,
			pingIntervalMs: 10,
			configTimeoutMs: 80,
		});
	});
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

		expect(get().hardwareLink).toEqual({
			status: "linked",
			drivenInputIds: ["bp"],
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

	it("reports the error code and stays disconnected when the firmware is absent", async () => {
		const { manager, get, notifier } = setup({
			board: { firmwarePresent: false },
		});
		await manager.link();
		expect(get().hardwareLink).toEqual(DISCONNECTED_HARDWARE_LINK);
		expect(notifier.linkFailed).toHaveBeenCalledWith("handshake-timeout");
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
