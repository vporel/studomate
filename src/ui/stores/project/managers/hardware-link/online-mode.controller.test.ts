import type RemoteIoClient from "@/hardware/arduino/remote-io/remote-io.client";
import type { ProjectStoreState } from "@/ui/stores/project/project.store";
import type HardwareLinkContext from "./hardware-link.context";
import type HardwareLinkNotifier from "./hardware-link.notifier";
import HardwareLinkSession from "./hardware-link.session";
import { DISCONNECTED_HARDWARE_LINK } from "./hardware-link.state";
import type HardwareSimulationBridge from "./hardware-simulation.bridge";
import OnlineModeController from "./online-mode.controller";

jest.mock("./prepare-board-program", () => ({
	__esModule: true,
	default: () => ({
		image: { imageId: 7, layout: { variableIndexByName: {} } },
		compiled: {},
	}),
}));

const POLL_MS = 20;

type Status = { state: string; imageId: number; fault: number };

function setup() {
	const session = new HardwareLinkSession();
	const status: Status = { state: "running", imageId: 7, fault: 0 };
	const client = {
		requestStatus: jest.fn(async () => ({ ...status })),
		startWatching: jest.fn(async () => {}),
		runProgram: jest.fn(async () => {}),
		releaseVariable: jest.fn(async () => {}),
		stopWatching: jest.fn(async () => {}),
	};
	const simulationManager = {
		startOnline: jest.fn(),
		setDesignMode: jest.fn(),
		publishBoardSnapshot: jest.fn(),
	};
	const notifier = {
		onlineFailed: jest.fn(),
		onlineLost: jest.fn(),
		boardVariableFailed: jest.fn(),
	};
	let state = {
		project: {},
		hardwareLink: { ...DISCONNECTED_HARDWARE_LINK, status: "linked" },
		simulationManager,
	} as unknown as ProjectStoreState;
	const context = {
		session,
		notifier: notifier as unknown as HardwareLinkNotifier,
		getStoreState: () => state,
		setStoreState: (partial: any) => {
			state = {
				...state,
				...(typeof partial === "function" ? partial(state) : partial),
			} as ProjectStoreState;
		},
		setLinkState: (hardwareLink: any) => {
			state = { ...state, hardwareLink } as ProjectStoreState;
		},
		resolvePlan: () => ({ plan: { inputs: [] }, descriptor: {} }),
		ioBindings: () => [],
		ensureLink: jest.fn(async () => {
			session.client = client as unknown as RemoteIoClient;
			return true;
		}),
		unlink: jest.fn(async () => {}),
		reportFailure: jest.fn(),
	} as unknown as HardwareLinkContext;
	const controller = new OnlineModeController(
		context,
		{ clearInputs: jest.fn() } as unknown as HardwareSimulationBridge,
		{ onlinePollMs: POLL_MS },
	);
	return { controller, session, client, status, simulationManager, notifier };
}

describe("OnlineModeController poll", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	const advance = (ms: number) => jest.advanceTimersByTimeAsync(ms);

	it("asks the board for its status every poll period once observing", async () => {
		const { controller, client } = setup();
		await expect(controller.start()).resolves.toBe(true);
		client.requestStatus.mockClear();

		await advance(POLL_MS);
		expect(client.requestStatus).toHaveBeenCalledTimes(1);
		await advance(POLL_MS * 2);
		expect(client.requestStatus).toHaveBeenCalledTimes(3);

		controller.detach();
	});

	it("starts no poll when the observation does not begin", async () => {
		const { controller, status } = setup();
		status.imageId = 8;

		await expect(controller.start()).resolves.toBe(false);

		expect(jest.getTimerCount()).toBe(0);
	});

	it("stops polling when the observation stops", async () => {
		const { controller, client } = setup();
		await controller.start();

		await controller.stop();
		client.requestStatus.mockClear();
		await advance(POLL_MS * 5);

		expect(jest.getTimerCount()).toBe(0);
		expect(client.requestStatus).not.toHaveBeenCalled();
		expect(controller.isActive()).toBe(false);
	});

	it("stops polling when the link is closed", async () => {
		const { controller, client, simulationManager } = setup();
		await controller.start();

		controller.detach();
		client.requestStatus.mockClear();
		await advance(POLL_MS * 5);

		expect(jest.getTimerCount()).toBe(0);
		expect(client.requestStatus).not.toHaveBeenCalled();
		expect(simulationManager.setDesignMode).toHaveBeenCalledTimes(1);
	});

	it("ignores a status poll started for a link that was replaced", async () => {
		const { controller, session, client, notifier, simulationManager } =
			setup();
		await controller.start();
		client.requestStatus.mockClear();

		session.invalidate();
		await advance(POLL_MS * 3);

		expect(client.requestStatus).not.toHaveBeenCalled();
		expect(notifier.onlineLost).not.toHaveBeenCalled();
		expect(simulationManager.setDesignMode).not.toHaveBeenCalled();
		controller.detach();
	});

	it("ignores the answer of a status poll the link outlived", async () => {
		const { controller, session, client, status, notifier } = setup();
		await controller.start();
		let answer!: (value: Status) => void;
		client.requestStatus.mockImplementationOnce(
			() => new Promise<Status>((resolve) => (answer = resolve)),
		);
		await advance(POLL_MS);

		session.invalidate();
		answer({ ...status, state: "fault", fault: 2 });
		await advance(0);

		expect(notifier.onlineLost).not.toHaveBeenCalled();
		controller.detach();
	});

	it("keeps quiet when the status request fails", async () => {
		const { controller, client, notifier } = setup();
		await controller.start();
		client.requestStatus.mockRejectedValue(new Error("silent"));

		await advance(POLL_MS * 2);

		expect(notifier.onlineLost).not.toHaveBeenCalled();
		controller.detach();
	});
});
