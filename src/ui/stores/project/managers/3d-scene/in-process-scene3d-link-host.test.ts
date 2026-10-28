import SceneView from "@/ui/components/3d-scene/scene-view";
import type { ProjectStoreState } from "@/ui/stores/project/project.store.types";
import createInProcessScene3dLinkHost from "./in-process-scene3d-link-host";
import Scene3dLinkManager from "./scene3d-link.manager";
import type { Scene3dStateSnapshot } from "./scene3d-simulation.bridge";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const managers: Scene3dLinkManager[] = [];
afterEach(() => managers.splice(0).forEach((manager) => manager.close()));

function createHarness() {
	let listener: ((snapshot: Scene3dStateSnapshot) => void) | null = null;
	const sendScene3dInteraction = jest.fn();
	const state = {
		project: {
			name: "Mon projet",
			scene3d: { sceneId: "carton-sorting", sceneVersion: 1, bindings: {} },
		},
		simulationManager: {
			getScene3dSnapshot: () => null,
			subscribeScene3d: (l: (snapshot: Scene3dStateSnapshot) => void) => {
				listener = l;
				return () => {
					listener = null;
				};
			},
			sendScene3dInteraction,
		},
	} as unknown as ProjectStoreState;
	const host = createInProcessScene3dLinkHost(() => state);
	const manager = new Scene3dLinkManager(host);
	managers.push(manager);
	return {
		host,
		manager,
		sendScene3dInteraction,
		emit: (snapshot: Scene3dStateSnapshot) => listener?.(snapshot),
		hasListener: () => listener !== null,
	};
}

function createView(transport: ReturnType<Scene3dLinkManager["openInline"]>) {
	return new SceneView({
		transport,
		now: () => Date.now(),
		getLerp: () => (_from, to) => to,
		onClose: jest.fn(),
	});
}

describe("in-process scene link", () => {
	it("opens no window", () => {
		const { host } = createHarness();

		expect(host.openWindow("in-process")).toBe(false);
		expect(host.getSessionId()).toBe("in-process");
	});

	it("hands the scene the configuration of the project over the page", async () => {
		const { manager } = createHarness();
		const view = createView(manager.openInline());

		await flush();

		expect(view.getSnapshot()).toMatchObject({
			sceneId: "carton-sorting",
			sceneVersion: 1,
			projectName: "Mon projet",
		});
		view.dispose();
	});

	it("follows the state the simulation publishes", async () => {
		const { manager, emit } = createHarness();
		const view = createView(manager.openInline());
		await flush();

		emit({
			sceneId: "carton-sorting",
			sceneVersion: 1,
			state: { n: 1 },
			simTimeMs: 0,
			status: "running",
		});
		await flush();

		expect(view.getSnapshot().phase).toBe("running");
		view.dispose();
	});

	it("passes the interactions of the scene to the simulation", async () => {
		const { manager, sendScene3dInteraction, emit } = createHarness();
		const view = createView(manager.openInline());
		await flush();
		emit({
			sceneId: "carton-sorting",
			sceneVersion: 1,
			state: {},
			simTimeMs: 0,
			status: "running",
		});
		await flush();

		view.sendInteraction({ kind: "click" });
		await flush();

		expect(sendScene3dInteraction).toHaveBeenCalledWith({ kind: "click" });
		view.dispose();
	});

	it("stops following the simulation once closed", async () => {
		const { manager, hasListener } = createHarness();
		const view = createView(manager.openInline());
		await flush();
		expect(hasListener()).toBe(true);

		manager.close();

		expect(hasListener()).toBe(false);
		view.dispose();
	});

	it("can be opened again after being closed, with a fresh link", async () => {
		const { manager } = createHarness();
		const first = createView(manager.openInline());
		await flush();
		manager.close();
		first.dispose();

		const second = createView(manager.openInline());
		await flush();

		expect(second.getSnapshot().projectName).toBe("Mon projet");
		second.dispose();
	});

	it("refuses to give the scene end of a link nobody opened", () => {
		const { host } = createHarness();

		expect(() => host.connectScene!("in-process")).toThrow();
	});
});
