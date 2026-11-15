import SceneChannel from "@/3d-scenes/link/scene-channel";
import { createTransportPair } from "@tests/utils/transport-pair";
import type {
	EditorToSceneMessage,
	SceneToEditorMessage,
} from "@/3d-scenes/link/scene-messages";
import type { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import Scene3dLinkManager, {
	PING_INTERVAL_MS,
	TAB_FIRST_ANSWER_TIMEOUT_MS,
	type Scene3dLinkHost,
} from "./scene3d-link.manager";
import type { Scene3dStateSnapshot } from "./scene3d-simulation.bridge";

const SCENE: Scene3d = {
	sceneId: "carton-sorting",
	sceneVersion: 1,
	bindings: {},
};

function snapshot(
	state: unknown,
	status: Scene3dStateSnapshot["status"] = "running",
	simTimeMs = 0,
) {
	return {
		sceneId: "carton-sorting",
		sceneVersion: 1,
		state,
		simTimeMs,
		status,
	};
}

function createHarness() {
	const [editorEnd, sceneEnd] = createTransportPair();
	let scene: Scene3d | null = SCENE;
	let current: Scene3dStateSnapshot | null = snapshot({ n: 0 }, "stopped");
	let stateListener: ((s: Scene3dStateSnapshot) => void) | null = null;
	let now = 0;
	let projectName = "Mon projet";
	const interactions: unknown[] = [];
	const openWindow = jest.fn(() => true);
	const unsubscribe = jest.fn();
	const onDockRequested = jest.fn();
	const host: Scene3dLinkHost = {
		getScene: () => scene,
		getProjectName: () => projectName,
		getSnapshot: () => current,
		subscribeState: (listener) => {
			stateListener = listener;
			return unsubscribe;
		},
		sendInteraction: (i) => interactions.push(i),
		createTransport: () => editorEnd,
		getSessionId: () => "session-1",
		openWindow,
		connectScene: () => sceneEnd,
		now: () => now,
	};
	const onTabConnectionChange = jest.fn();
	const manager = new Scene3dLinkManager(host, {
		onDockRequested,
		onTabConnectionChange,
	});
	const sceneChannel = new SceneChannel<
		SceneToEditorMessage,
		EditorToSceneMessage
	>(sceneEnd);
	const received: EditorToSceneMessage[] = [];
	sceneChannel.onMessage((message) => received.push(message));
	return {
		manager,
		open: () => {
			manager.open();
			received.length = 0;
		},
		sceneChannel,
		received,
		interactions,
		openWindow,
		onDockRequested,
		onTabConnectionChange,
		unsubscribe,
		emit: (s: Scene3dStateSnapshot) => stateListener!(s),
		setProjectName: (name: string) => (projectName = name),
		setScene: (s: Scene3d | null) => (scene = s),
		setSnapshot: (s: Scene3dStateSnapshot | null) => (current = s),
		advance: (ms: number) => {
			now += ms;
			jest.advanceTimersByTime(ms);
		},
	};
}

describe("Scene3dLinkManager", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("opens the window of its session and pings the tab at once, in case it is already open", () => {
		const h = createHarness();
		h.manager.open();
		expect(h.openWindow).toHaveBeenCalledWith("session-1");
		expect(h.received).toEqual([{ type: "ping" }]);
	});

	it("tells whether the browser opened the window, and stays connected when it did not", () => {
		const h = createHarness();
		h.openWindow.mockReturnValueOnce(false);
		expect(h.manager.open()).toBe(false);
		expect(h.received).toEqual([{ type: "ping" }]);
		expect(h.manager.open()).toBe(true);
	});

	it("answers hello with the configuration and the current state, also outside a simulation", () => {
		const h = createHarness();
		h.open();
		h.sceneChannel.send({ type: "hello" });
		expect(h.received).toEqual([
			{
				type: "config",
				sceneId: "carton-sorting",
				sceneVersion: 1,
				projectName: "Mon projet",
			},
			{ type: "state", ...snapshot({ n: 0 }, "stopped") },
		]);
	});

	it("resynchronises on a new hello even when the state did not change", () => {
		const h = createHarness();
		h.open();
		h.sceneChannel.send({ type: "hello" });
		h.received.length = 0;
		h.sceneChannel.send({ type: "hello" });
		expect(h.received.map((m) => m.type)).toEqual(["config", "state"]);
	});

	it("sends a state only when the state or the status changed", () => {
		const h = createHarness();
		h.open();
		h.emit(snapshot({ n: 1 }, "running", 100));
		h.emit(snapshot({ n: 1 }, "running", 200));
		h.emit(snapshot({ n: 1 }, "paused", 200));
		h.emit(snapshot({ n: 2 }, "paused", 300));
		expect(h.received.map((m) => m.type)).toEqual(["state", "state", "state"]);
	});

	it("forwards the interactions of the scene tab to the simulation", () => {
		const h = createHarness();
		h.open();
		h.sceneChannel.send({
			type: "interaction",
			interaction: { type: "newCarton" },
		});
		expect(h.interactions).toEqual([{ type: "newCarton" }]);
	});

	it("sends close and stops listening when closed", () => {
		const h = createHarness();
		h.open();
		h.manager.close();
		expect(h.received).toEqual([{ type: "close" }]);
		expect(h.unsubscribe).toHaveBeenCalled();
		h.received.length = 0;
		h.sceneChannel.send({ type: "interaction", interaction: {} });
		expect(h.interactions).toEqual([]);
	});

	it("does nothing when closed without a tab", () => {
		const h = createHarness();
		expect(() => h.manager.close()).not.toThrow();
		expect(h.received).toEqual([]);
	});

	it("closes the tab when the scene is removed from the project", () => {
		const h = createHarness();
		h.open();
		h.setScene(null);
		h.manager.onSceneChanged();
		expect(h.received).toEqual([{ type: "close" }]);
	});

	it("sends a new configuration when the scene is replaced", () => {
		const h = createHarness();
		h.open();
		h.setScene({ sceneId: "other", sceneVersion: 1, bindings: {} });
		h.manager.onSceneChanged();
		expect(h.received[0]).toEqual({
			type: "config",
			sceneId: "other",
			sceneVersion: 1,
			projectName: "Mon projet",
		});
	});

	it("sends a new configuration when the project is renamed", () => {
		const h = createHarness();
		h.open();
		h.sceneChannel.send({ type: "hello" });
		h.received.length = 0;
		h.setProjectName("Nouveau nom");
		h.manager.onSceneChanged();
		expect(h.received[0]).toEqual({
			type: "config",
			sceneId: "carton-sorting",
			sceneVersion: 1,
			projectName: "Nouveau nom",
		});
	});

	it("tracks the connection of the scene tab with pings, pongs and bye", () => {
		const h = createHarness();
		h.open();
		expect(h.manager.isSceneConnected()).toBe(false);

		h.advance(PING_INTERVAL_MS);
		expect(h.received.some((m) => m.type === "ping")).toBe(true);
		h.sceneChannel.send({ type: "pong" });
		expect(h.manager.isSceneConnected()).toBe(true);

		h.advance(PING_INTERVAL_MS * 4);
		expect(h.manager.isSceneConnected()).toBe(false);

		h.sceneChannel.send({ type: "pong" });
		expect(h.manager.isSceneConnected()).toBe(true);
		h.sceneChannel.send({ type: "bye" });
		expect(h.manager.isSceneConnected()).toBe(false);
	});

	it("stops pinging once closed", () => {
		const h = createHarness();
		h.open();
		h.manager.close();
		h.received.length = 0;
		h.advance(PING_INTERVAL_MS * 3);
		expect(h.received).toEqual([]);
	});

	it("passes on the request of the scene tab to be shown in the page", () => {
		const h = createHarness();
		h.open();
		h.sceneChannel.send({ type: "dock-request" });
		expect(h.onDockRequested).toHaveBeenCalledTimes(1);
	});

	describe("connection of the scene tab", () => {
		it("reports the tab once it answers", () => {
			const h = createHarness();
			h.open();
			h.sceneChannel.send({ type: "hello" });
			expect(h.onTabConnectionChange).toHaveBeenCalledTimes(1);
			expect(h.onTabConnectionChange).toHaveBeenCalledWith(true);
		});

		it("does not report the same connection twice", () => {
			const h = createHarness();
			h.open();
			h.sceneChannel.send({ type: "hello" });
			h.sceneChannel.send({ type: "pong" });
			h.advance(PING_INTERVAL_MS);
			expect(h.onTabConnectionChange).toHaveBeenCalledTimes(1);
		});

		it("reports the tab once it stopped answering", () => {
			const h = createHarness();
			h.open();
			h.sceneChannel.send({ type: "hello" });
			h.onTabConnectionChange.mockClear();
			h.advance(PING_INTERVAL_MS * 4);
			expect(h.onTabConnectionChange).toHaveBeenCalledWith(false);
		});

		it("gives a tab that has not answered yet the time to load", () => {
			const h = createHarness();
			h.open();
			h.advance(TAB_FIRST_ANSWER_TIMEOUT_MS);
			expect(h.onTabConnectionChange).not.toHaveBeenCalled();
		});

		it("reports the tab closed once it never answered in time, only once", () => {
			const h = createHarness();
			h.open();
			h.advance(TAB_FIRST_ANSWER_TIMEOUT_MS + PING_INTERVAL_MS);
			h.advance(PING_INTERVAL_MS * 4);
			expect(h.onTabConnectionChange).toHaveBeenCalledTimes(1);
			expect(h.onTabConnectionChange).toHaveBeenCalledWith(false);
		});

		it("reports a tab that answers after the deadline as connected", () => {
			const h = createHarness();
			h.open();
			h.advance(TAB_FIRST_ANSWER_TIMEOUT_MS + PING_INTERVAL_MS);
			h.onTabConnectionChange.mockClear();
			h.sceneChannel.send({ type: "hello" });
			expect(h.onTabConnectionChange).toHaveBeenCalledWith(true);
		});

		it("does not wait for a first answer from a tab already connected", () => {
			const h = createHarness();
			h.open();
			h.sceneChannel.send({ type: "hello" });
			h.manager.open();
			h.sceneChannel.send({ type: "pong" });
			h.onTabConnectionChange.mockClear();
			for (let i = 0; i < 10; i++) {
				h.advance(PING_INTERVAL_MS);
				h.sceneChannel.send({ type: "pong" });
			}
			expect(h.onTabConnectionChange).not.toHaveBeenCalled();
		});

		it("reports the tab closed as soon as it says goodbye", () => {
			const h = createHarness();
			h.open();
			h.sceneChannel.send({ type: "hello" });
			h.onTabConnectionChange.mockClear();
			h.sceneChannel.send({ type: "bye" });
			expect(h.onTabConnectionChange).toHaveBeenCalledWith(false);
		});

		it("does not wait for the tab when the browser blocked it", () => {
			const h = createHarness();
			h.openWindow.mockReturnValueOnce(false);
			h.open();
			h.advance(TAB_FIRST_ANSWER_TIMEOUT_MS + PING_INTERVAL_MS);
			expect(h.onTabConnectionChange).not.toHaveBeenCalled();
		});

		it("reports nothing for the scene shown in the page", () => {
			const h = createHarness();
			h.manager.openInline();
			h.sceneChannel.send({ type: "hello" });
			h.advance(PING_INTERVAL_MS * 4);
			expect(h.onTabConnectionChange).not.toHaveBeenCalled();
		});
	});

	describe("scene shown in the page", () => {
		it("hands the scene its end of the link and answers its hello", () => {
			const h = createHarness();
			const sceneEnd = h.manager.openInline();
			expect(sceneEnd).toBeDefined();
			h.received.length = 0;
			h.sceneChannel.send({ type: "hello" });
			expect(h.received.map((message) => message.type)).toEqual([
				"config",
				"state",
			]);
		});

		it("ends the link when the page releases it", () => {
			const h = createHarness();
			h.manager.openInline();
			h.manager.releaseInline();
			expect(h.unsubscribe).toHaveBeenCalledTimes(1);
			h.received.length = 0;
			h.advance(PING_INTERVAL_MS * 2);
			expect(h.received).toEqual([]);
		});

		it("keeps the link of a window opened since, whose view replaces the page's", () => {
			const h = createHarness();
			h.manager.openInline();
			h.manager.open();
			h.manager.releaseInline();
			expect(h.unsubscribe).not.toHaveBeenCalled();
		});

		it("still ends the link of the page's scene when the browser blocked the window opened over it", () => {
			const h = createHarness();
			h.manager.openInline();
			h.openWindow.mockReturnValueOnce(false);
			h.manager.open();
			h.manager.releaseInline();
			expect(h.unsubscribe).toHaveBeenCalledTimes(1);
		});

		it("ignores a release when no scene is shown in the page", () => {
			const h = createHarness();
			h.open();
			h.manager.releaseInline();
			expect(h.unsubscribe).not.toHaveBeenCalled();
		});

		it("can be linked again after a release", () => {
			const h = createHarness();
			h.manager.openInline();
			h.manager.releaseInline();
			h.manager.openInline();
			h.sceneChannel.send({ type: "hello" });
			h.manager.releaseInline();
			expect(h.unsubscribe).toHaveBeenCalledTimes(2);
		});
	});
});
