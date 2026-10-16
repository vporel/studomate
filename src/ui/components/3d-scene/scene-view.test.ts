import SceneChannel from "@/3d-scenes/link/scene-channel";
import type {
	EditorToSceneMessage,
	SceneToEditorMessage,
} from "@/3d-scenes/link/scene-messages";
import { createTransportPair } from "@tests/utils/transport-pair";
import SceneView, { EDITOR_SILENCE_TIMEOUT_MS } from "./scene-view";

const lerp = (from: unknown, to: unknown, ratio: number) =>
	(from as number) + ((to as number) - (from as number)) * ratio;

function createHarness(knownScenes = ["carton-sorting@1"]) {
	const [sceneEnd, editorEnd] = createTransportPair();
	const editor = new SceneChannel<EditorToSceneMessage, SceneToEditorMessage>(
		editorEnd,
	);
	const received: SceneToEditorMessage[] = [];
	editor.onMessage((message) => received.push(message));
	let now = 1000;
	const onClose = jest.fn();
	const view = new SceneView({
		transport: sceneEnd,
		now: () => now,
		getLerp: (id, version) =>
			knownScenes.includes(`${id}@${version}`) ? lerp : undefined,
		onClose,
	});
	return {
		view,
		editor,
		received,
		onClose,
		advance: (ms: number) => {
			now += ms;
			jest.advanceTimersByTime(ms);
		},
	};
}

const state = (
	value: number,
	status: "stopped" | "running" | "paused",
	simTimeMs = 0,
) =>
	({
		type: "state",
		sceneId: "carton-sorting",
		sceneVersion: 1,
		state: value,
		simTimeMs,
		status,
	}) as const;

describe("SceneView", () => {
	beforeEach(() => jest.useFakeTimers());
	afterEach(() => jest.useRealTimers());

	it("says hello on creation and waits for the editor", () => {
		const h = createHarness();
		expect(h.received).toEqual([{ type: "hello" }]);
		expect(h.view.getSnapshot()).toEqual({
			phase: "waiting",
			sceneId: null,
			sceneVersion: null,
			projectName: null,
		});
		h.view.dispose();
	});

	it.each(["stopped", "running", "paused"] as const)(
		"shows the %s phase from the state received",
		(status) => {
			const h = createHarness();
			h.editor.send({
				type: "config",
				sceneId: "carton-sorting",
				sceneVersion: 1,
				projectName: "Mon projet",
			});
			h.editor.send(state(1, status));
			expect(h.view.getSnapshot()).toEqual({
				phase: status,
				sceneId: "carton-sorting",
				sceneVersion: 1,
				projectName: "Mon projet",
			});
			h.view.dispose();
		},
	);

	it("notifies its subscribers of a change only", () => {
		const h = createHarness();
		const listener = jest.fn();
		h.view.subscribe(listener);
		h.editor.send(state(1, "running"));
		const calls = listener.mock.calls.length;
		h.editor.send(state(2, "running", 100));
		expect(listener.mock.calls.length).toBe(calls);
		h.view.dispose();
	});

	it("blends the received states", () => {
		const h = createHarness();
		h.editor.send(state(0, "running", 0));
		h.advance(100);
		h.editor.send(state(10, "running", 100));
		h.advance(50);
		expect(h.view.sampleState()).toBe(5);
		h.view.dispose();
	});

	it("has no state to sample before the first one", () => {
		const h = createHarness();
		expect(h.view.sampleState()).toBeNull();
		h.view.dispose();
	});

	it("sends interactions during a simulation, running or paused", () => {
		const h = createHarness();
		h.editor.send(state(0, "running"));
		h.view.sendInteraction({ type: "newCarton" });
		h.editor.send(state(0, "paused"));
		h.view.sendInteraction({ type: "newCarton" });
		expect(h.received.filter((m) => m.type === "interaction")).toHaveLength(2);
		h.view.dispose();
	});

	it("does not send interactions outside a simulation", () => {
		const h = createHarness();
		h.view.sendInteraction({ type: "newCarton" });
		h.editor.send(state(0, "stopped"));
		h.view.sendInteraction({ type: "newCarton" });
		expect(h.received.some((m) => m.type === "interaction")).toBe(false);
		h.view.dispose();
	});

	it("closes its tab on close", () => {
		const h = createHarness();
		h.editor.send({ type: "close" });
		expect(h.onClose).toHaveBeenCalledTimes(1);
		h.view.dispose();
	});

	it("answers a ping with a pong", () => {
		const h = createHarness();
		h.editor.send({ type: "ping" });
		expect(h.received.some((m) => m.type === "pong")).toBe(true);
		h.view.dispose();
	});

	it("shows the editor as closed after a silence, and reconnects on its next ping", () => {
		const h = createHarness();
		h.editor.send(state(0, "running"));
		h.advance(EDITOR_SILENCE_TIMEOUT_MS + 1500);
		expect(h.view.getSnapshot().phase).toBe("editor-closed");

		h.received.length = 0;
		h.editor.send({ type: "ping" });
		expect(h.received.map((m) => m.type)).toEqual(["pong", "hello"]);

		h.editor.send(state(0, "running", 100));
		expect(h.view.getSnapshot().phase).toBe("running");
		h.view.dispose();
	});

	it("keeps the editor as present while it keeps sending", () => {
		const h = createHarness();
		h.editor.send(state(0, "running"));
		for (let i = 0; i < 5; i++) {
			h.advance(2000);
			h.editor.send({ type: "ping" });
		}
		expect(h.view.getSnapshot().phase).toBe("running");
		h.view.dispose();
	});

	it("tracks a scene unknown to this version without any state to sample", () => {
		const h = createHarness([]);
		h.editor.send(state(0, "running"));
		expect(h.view.getSnapshot().sceneId).toBe("carton-sorting");
		expect(h.view.sampleState()).toBeNull();
		h.view.dispose();
	});

	it("treats a version unknown to this build as an unknown scene", () => {
		const h = createHarness();
		h.editor.send({ ...state(0, "running"), sceneVersion: 2 });
		expect(h.view.getSnapshot().sceneVersion).toBe(2);
		expect(h.view.sampleState()).toBeNull();
		h.view.dispose();
	});

	it("says bye and releases the transport on dispose", () => {
		const h = createHarness();
		h.received.length = 0;
		h.view.dispose();
		expect(h.received).toEqual([{ type: "bye" }]);
	});
});
