import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	ProjectStoreState,
} from "@/ui/stores/project/project.store.types";
import Scene3dDisplayManager, {
	resolveScene3dDisplayMode,
	selectScene3dShownMode,
} from "./scene3d-display.manager";

const ALL_MODES: Scene3dDisplayMode[] = [
	Scene3dDisplayMode.SIDE_PANEL,
	Scene3dDisplayMode.FLOATING_BOX,
	Scene3dDisplayMode.PAGE,
	Scene3dDisplayMode.BROWSER_TAB,
];

function createHarness({
	mode = Scene3dDisplayMode.FLOATING_BOX as Scene3dDisplayMode,
	stored = null as Scene3dDisplayMode | null,
	availableModes = ALL_MODES,
	defaultMode = Scene3dDisplayMode.FLOATING_BOX as Scene3dDisplayMode,
	floatingVisible = false,
	sidePanelVisible = false,
	browserTabOpen = false,
	pageOpen = false,
	pageActive = true,
	hasScene = true,
	tabOpens = true,
} = {}) {
	const linkManager = {
		open: jest.fn(() => tabOpens),
		close: jest.fn(),
		onSceneChanged: jest.fn(),
	};
	const pagesManager = {
		openPage: jest.fn(),
		closePage: jest.fn(),
	};
	let state = {
		project: hasScene
			? { scene3d: { sceneId: "carton-sorting", sceneVersion: 1 } }
			: { scene3d: undefined },
		ui: {
			scene3dFloatingVisible: floatingVisible,
			scene3dSidePanelVisible: sidePanelVisible,
			scene3dBrowserTabOpen: browserTabOpen,
			scene3dDisplayMode: mode,
		},
		pagesData: pageOpen
			? { "scene3d-view": { id: "scene3d-view", type: "scene3d-view" } }
			: {},
		activePageId: pageOpen && pageActive ? "scene3d-view" : null,
		scene3dLinkManager: linkManager,
		pagesManager,
	} as unknown as ProjectStoreState;
	const set: ProjectStoreSetFunction = (partial) => {
		const next = typeof partial === "function" ? partial(state) : partial;
		state = { ...state, ...next };
	};
	const get: ProjectStoreGetFunction = () => state;
	const preferences = {
		getScene3dDisplayMode: jest.fn(() => stored),
		setScene3dDisplayMode: jest.fn(),
	};
	const trackEvent = jest.fn();
	const scene3dOpenBlocked = jest.fn();
	const env = {
		analytics: { trackEvent },
		preferences,
		simulationNotifier: { scene3dOpenBlocked },
		scene3dDisplay: { availableModes, defaultMode },
	};
	return {
		manager: new Scene3dDisplayManager(set, get, env as never),
		env,
		linkManager,
		pagesManager,
		preferences,
		trackEvent,
		scene3dOpenBlocked,
		floatingVisible: () => state.ui.scene3dFloatingVisible,
		sidePanelVisible: () => state.ui.scene3dSidePanelVisible,
		browserTabOpen: () => state.ui.scene3dBrowserTabOpen,
		shownMode: () => selectScene3dShownMode(state),
		currentMode: () => state.ui.scene3dDisplayMode,
		setScene: (hasScene3d: boolean) => {
			state = {
				...state,
				project: { scene3d: hasScene3d ? {} : undefined },
			} as unknown as ProjectStoreState;
		},
	};
}

describe("resolveScene3dDisplayMode", () => {
	it.each([
		[
			"the environment's default until the user chose",
			null,
			Scene3dDisplayMode.FLOATING_BOX,
		],
		[
			"the mode the user chose",
			Scene3dDisplayMode.BROWSER_TAB,
			Scene3dDisplayMode.BROWSER_TAB,
		],
	] as const)("is %s", (_label, stored, expected) => {
		const { env } = createHarness({ stored });
		expect(resolveScene3dDisplayMode(env as never)).toBe(expected);
	});

	it("falls back to the default when the chosen mode is not offered", () => {
		const { env } = createHarness({
			stored: Scene3dDisplayMode.BROWSER_TAB,
			availableModes: [Scene3dDisplayMode.PAGE],
			defaultMode: Scene3dDisplayMode.PAGE,
		});
		expect(resolveScene3dDisplayMode(env as never)).toBe(
			Scene3dDisplayMode.PAGE,
		);
	});
});

describe("selectScene3dShownMode", () => {
	it.each([
		["nowhere", {}, null],
		[
			"the floating box",
			{ floatingVisible: true },
			Scene3dDisplayMode.FLOATING_BOX,
		],
		["a page", { pageOpen: true }, Scene3dDisplayMode.PAGE],
		[
			"nowhere when its page is in the background",
			{ pageOpen: true, pageActive: false },
			null,
		],
		["a browser tab", { browserTabOpen: true }, Scene3dDisplayMode.BROWSER_TAB],
		[
			"the side panel",
			{ sidePanelVisible: true },
			Scene3dDisplayMode.SIDE_PANEL,
		],
	] as const)("is %s", (_label, options, expected) => {
		expect(createHarness(options).shownMode()).toBe(expected);
	});
});

describe("Scene3dDisplayManager", () => {
	it("exposes the modes of the environment", () => {
		const h = createHarness({
			availableModes: [Scene3dDisplayMode.PAGE],
			defaultMode: Scene3dDisplayMode.PAGE,
		});
		expect(h.manager.availableModes).toEqual([Scene3dDisplayMode.PAGE]);
	});

	describe("open, in the current mode", () => {
		it("shows the floating box, without opening a browser tab or a page", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.FLOATING_BOX });
			expect(h.manager.open()).toBe(true);
			expect(h.floatingVisible()).toBe(true);
			expect(h.linkManager.open).not.toHaveBeenCalled();
			expect(h.pagesManager.openPage).not.toHaveBeenCalled();
		});

		it("closes a browser tab left open, so that the scene is shown once", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.FLOATING_BOX });
			h.manager.open();
			expect(h.linkManager.close).toHaveBeenCalledTimes(1);
		});

		it("leaves a floating box already shown untouched: its link is live", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.FLOATING_BOX,
				floatingVisible: true,
			});
			expect(h.manager.open()).toBe(true);
			expect(h.linkManager.close).not.toHaveBeenCalled();
			expect(h.trackEvent).not.toHaveBeenCalled();
		});

		it("tracks the opening with the scene and the mode", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.FLOATING_BOX });
			h.manager.open();
			expect(h.trackEvent).toHaveBeenCalledWith("scene-opened", {
				scene: "carton-sorting",
				mode: Scene3dDisplayMode.FLOATING_BOX,
			});
		});

		it("opens the page of the scene in page mode", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.PAGE });
			expect(h.manager.open()).toBe(true);
			expect(h.pagesManager.openPage).toHaveBeenCalledWith(
				expect.objectContaining({ id: "scene3d-view", type: "scene3d-view" }),
			);
			expect(h.floatingVisible()).toBe(false);
			expect(h.linkManager.open).not.toHaveBeenCalled();
		});

		it("brings forward the page of the scene when it is already open, without relinking", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.PAGE,
				pageOpen: true,
			});
			h.manager.open();
			expect(h.pagesManager.openPage).toHaveBeenCalledWith(
				expect.objectContaining({ id: "scene3d-view" }),
			);
			expect(h.linkManager.close).not.toHaveBeenCalled();
		});

		it("opens the browser tab in browser-tab mode and says whether the browser allowed it", () => {
			const allowed = createHarness({ mode: Scene3dDisplayMode.BROWSER_TAB });
			expect(allowed.manager.open()).toBe(true);
			expect(allowed.floatingVisible()).toBe(false);

			const blocked = createHarness({
				mode: Scene3dDisplayMode.BROWSER_TAB,
				tabOpens: false,
			});
			expect(blocked.manager.open()).toBe(false);
			expect(blocked.scene3dOpenBlocked).toHaveBeenCalledTimes(1);
		});
	});

	describe("toggle", () => {
		it("hides the floating box when it is shown", () => {
			const h = createHarness({ floatingVisible: true });
			h.manager.toggle();
			expect(h.floatingVisible()).toBe(false);
		});

		it("closes the page and the browser tab when they are shown", () => {
			const page = createHarness({
				mode: Scene3dDisplayMode.PAGE,
				pageOpen: true,
			});
			page.manager.toggle();
			expect(page.pagesManager.closePage).toHaveBeenCalledWith("scene3d-view");

			const tab = createHarness({
				mode: Scene3dDisplayMode.BROWSER_TAB,
				browserTabOpen: true,
			});
			tab.manager.toggle();
			expect(tab.linkManager.close).toHaveBeenCalledTimes(1);
			expect(tab.browserTabOpen()).toBe(false);
		});

		it("brings the page of the scene forward when it is in the background, whatever the mode", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.FLOATING_BOX,
				pageOpen: true,
				pageActive: false,
			});
			h.manager.toggle();
			expect(h.pagesManager.openPage).toHaveBeenCalledWith({
				id: "scene3d-view",
				type: "scene3d-view",
			});
			expect(h.pagesManager.closePage).not.toHaveBeenCalled();
			expect(h.floatingVisible()).toBe(false);
			expect(h.linkManager.close).not.toHaveBeenCalled();
		});

		it("shows the scene in the current mode otherwise", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.PAGE });
			h.manager.toggle();
			expect(h.pagesManager.openPage).toHaveBeenCalledTimes(1);
		});
	});

	describe("show", () => {
		it("refuses a mode the environment does not offer", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.PAGE,
				availableModes: [Scene3dDisplayMode.PAGE],
				defaultMode: Scene3dDisplayMode.PAGE,
			});
			expect(h.manager.show(Scene3dDisplayMode.BROWSER_TAB)).toBe(false);
			expect(h.linkManager.open).not.toHaveBeenCalled();
			expect(h.preferences.setScene3dDisplayMode).not.toHaveBeenCalled();
			expect(h.currentMode()).toBe(Scene3dDisplayMode.PAGE);
		});

		it("makes the browser tab replace the floating box, and remembers it", () => {
			const h = createHarness({ floatingVisible: true });
			expect(h.manager.show(Scene3dDisplayMode.BROWSER_TAB)).toBe(true);
			expect(h.linkManager.open).toHaveBeenCalledTimes(1);
			expect(h.floatingVisible()).toBe(false);
			expect(h.preferences.setScene3dDisplayMode).toHaveBeenCalledWith(
				Scene3dDisplayMode.BROWSER_TAB,
			);
			expect(h.currentMode()).toBe(Scene3dDisplayMode.BROWSER_TAB);
		});

		it("makes the browser tab replace the page of the scene", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.PAGE,
				pageOpen: true,
			});
			h.manager.show(Scene3dDisplayMode.BROWSER_TAB);
			expect(h.pagesManager.closePage).toHaveBeenCalledWith("scene3d-view");
		});

		it("keeps the shown scene, the mode and the preference when the browser blocks the tab, and offers to retry", () => {
			const h = createHarness({ floatingVisible: true, tabOpens: false });
			expect(h.manager.show(Scene3dDisplayMode.BROWSER_TAB)).toBe(false);
			expect(h.floatingVisible()).toBe(true);
			expect(h.currentMode()).toBe(Scene3dDisplayMode.FLOATING_BOX);
			expect(h.preferences.setScene3dDisplayMode).not.toHaveBeenCalled();

			h.linkManager.open.mockReturnValue(true);
			h.scene3dOpenBlocked.mock.calls[0][0]();
			expect(h.floatingVisible()).toBe(false);
			expect(h.currentMode()).toBe(Scene3dDisplayMode.BROWSER_TAB);
		});

		it("makes the page replace the floating box", () => {
			const h = createHarness({ floatingVisible: true });
			expect(h.manager.show(Scene3dDisplayMode.PAGE)).toBe(true);
			expect(h.floatingVisible()).toBe(false);
			expect(h.pagesManager.openPage).toHaveBeenCalledTimes(1);
			expect(h.currentMode()).toBe(Scene3dDisplayMode.PAGE);
			expect(h.linkManager.close).toHaveBeenCalledTimes(1);
		});

		it("makes the floating box replace the page", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.PAGE,
				pageOpen: true,
			});
			expect(h.manager.show(Scene3dDisplayMode.FLOATING_BOX)).toBe(true);
			expect(h.pagesManager.closePage).toHaveBeenCalledWith("scene3d-view");
			expect(h.floatingVisible()).toBe(true);
			expect(h.preferences.setScene3dDisplayMode).toHaveBeenCalledWith(
				Scene3dDisplayMode.FLOATING_BOX,
			);
		});

		it("closes the browser tab when it goes back to the editor", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.BROWSER_TAB });
			h.manager.show(Scene3dDisplayMode.FLOATING_BOX);
			expect(h.linkManager.close).toHaveBeenCalledTimes(1);
			expect(h.floatingVisible()).toBe(true);
		});

		it("uses the new mode from then on", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.BROWSER_TAB });
			h.manager.show(Scene3dDisplayMode.FLOATING_BOX);
			h.manager.close();
			h.linkManager.open.mockClear();
			expect(h.manager.open()).toBe(true);
			expect(h.linkManager.open).not.toHaveBeenCalled();
			expect(h.floatingVisible()).toBe(true);
		});
	});

	describe("side panel", () => {
		it("is shown by open in side-panel mode, without a page nor a browser tab", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.SIDE_PANEL });
			expect(h.manager.open()).toBe(true);
			expect(h.sidePanelVisible()).toBe(true);
			expect(h.floatingVisible()).toBe(false);
			expect(h.linkManager.open).not.toHaveBeenCalled();
			expect(h.pagesManager.openPage).not.toHaveBeenCalled();
			expect(h.trackEvent).toHaveBeenCalledWith("scene-opened", {
				scene: "carton-sorting",
				mode: Scene3dDisplayMode.SIDE_PANEL,
			});
		});

		it("is left untouched when it is already shown: its link is live", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.SIDE_PANEL,
				sidePanelVisible: true,
			});
			h.manager.open();
			expect(h.linkManager.close).not.toHaveBeenCalled();
			expect(h.trackEvent).not.toHaveBeenCalled();
		});

		it("replaces the floating box, and the floating box replaces it", () => {
			const h = createHarness({ floatingVisible: true });
			h.manager.show(Scene3dDisplayMode.SIDE_PANEL);
			expect(h.sidePanelVisible()).toBe(true);
			expect(h.floatingVisible()).toBe(false);
			expect(h.linkManager.close).toHaveBeenCalledTimes(1);
			expect(h.currentMode()).toBe(Scene3dDisplayMode.SIDE_PANEL);

			h.manager.show(Scene3dDisplayMode.FLOATING_BOX);
			expect(h.sidePanelVisible()).toBe(false);
			expect(h.floatingVisible()).toBe(true);
		});

		it("replaces the page, and the page replaces it", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.PAGE,
				pageOpen: true,
			});
			h.manager.show(Scene3dDisplayMode.SIDE_PANEL);
			expect(h.pagesManager.closePage).toHaveBeenCalledWith("scene3d-view");
			expect(h.sidePanelVisible()).toBe(true);

			h.manager.show(Scene3dDisplayMode.PAGE);
			expect(h.sidePanelVisible()).toBe(false);
			expect(h.pagesManager.openPage).toHaveBeenCalledTimes(1);
		});

		it("is replaced by the browser tab", () => {
			const h = createHarness({ sidePanelVisible: true });
			h.manager.show(Scene3dDisplayMode.BROWSER_TAB);
			expect(h.sidePanelVisible()).toBe(false);
			expect(h.browserTabOpen()).toBe(true);
		});

		it("is closed by close and by toggle", () => {
			const closed = createHarness({ sidePanelVisible: true });
			closed.manager.close();
			expect(closed.sidePanelVisible()).toBe(false);

			const toggled = createHarness({ sidePanelVisible: true });
			toggled.manager.toggle();
			expect(toggled.sidePanelVisible()).toBe(false);
		});

		it("is hidden once the project has no scene", () => {
			const h = createHarness({ sidePanelVisible: true });
			h.setScene(false);
			h.manager.onSceneChanged();
			expect(h.sidePanelVisible()).toBe(false);
		});

		it("is where a browser tab docks when it is the default mode", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.BROWSER_TAB,
				defaultMode: Scene3dDisplayMode.SIDE_PANEL,
				availableModes: [
					Scene3dDisplayMode.SIDE_PANEL,
					Scene3dDisplayMode.FLOATING_BOX,
					Scene3dDisplayMode.PAGE,
					Scene3dDisplayMode.BROWSER_TAB,
				],
			});
			h.manager.dock();
			expect(h.sidePanelVisible()).toBe(true);
			expect(h.currentMode()).toBe(Scene3dDisplayMode.SIDE_PANEL);
		});
	});

	describe("dock", () => {
		it("brings the scene back in the environment's default mode", () => {
			const h = createHarness({ mode: Scene3dDisplayMode.BROWSER_TAB });
			h.manager.dock();
			expect(h.currentMode()).toBe(Scene3dDisplayMode.FLOATING_BOX);
			expect(h.floatingVisible()).toBe(true);
		});

		it("uses the first mode that shows the scene in the editor when the default is the browser tab", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.BROWSER_TAB,
				defaultMode: Scene3dDisplayMode.BROWSER_TAB,
				availableModes: [
					Scene3dDisplayMode.BROWSER_TAB,
					Scene3dDisplayMode.PAGE,
				],
			});
			h.manager.dock();
			expect(h.currentMode()).toBe(Scene3dDisplayMode.PAGE);
			expect(h.pagesManager.openPage).toHaveBeenCalledTimes(1);
		});

		it("does nothing when no mode shows the scene in the editor", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.BROWSER_TAB,
				defaultMode: Scene3dDisplayMode.BROWSER_TAB,
				availableModes: [Scene3dDisplayMode.BROWSER_TAB],
			});
			h.manager.dock();
			expect(h.currentMode()).toBe(Scene3dDisplayMode.BROWSER_TAB);
			expect(h.linkManager.close).not.toHaveBeenCalled();
		});
	});

	describe("browser tab state", () => {
		it("is open once the tab was opened, and closed when another mode replaces it", () => {
			const h = createHarness();
			h.manager.show(Scene3dDisplayMode.BROWSER_TAB);
			expect(h.shownMode()).toBe(Scene3dDisplayMode.BROWSER_TAB);

			h.manager.show(Scene3dDisplayMode.FLOATING_BOX);
			expect(h.browserTabOpen()).toBe(false);
			expect(h.shownMode()).toBe(Scene3dDisplayMode.FLOATING_BOX);
		});

		it("follows the connection of the tab", () => {
			const h = createHarness({
				mode: Scene3dDisplayMode.BROWSER_TAB,
				browserTabOpen: true,
			});
			h.manager.onBrowserTabConnectionChange(false);
			expect(h.browserTabOpen()).toBe(false);
			h.manager.onBrowserTabConnectionChange(true);
			expect(h.browserTabOpen()).toBe(true);
		});

		it("is closed once the project has no scene", () => {
			const h = createHarness({ browserTabOpen: true });
			h.setScene(false);
			h.manager.onSceneChanged();
			expect(h.browserTabOpen()).toBe(false);
		});
	});

	describe("close", () => {
		it("hides the floating box, closes the page and the browser tab", () => {
			const h = createHarness({ floatingVisible: true, pageOpen: true });
			h.manager.close();
			expect(h.floatingVisible()).toBe(false);
			expect(h.pagesManager.closePage).toHaveBeenCalledWith("scene3d-view");
			expect(h.linkManager.close).toHaveBeenCalledTimes(1);
		});
	});

	describe("onSceneChanged", () => {
		it("hides the scene in the editor once the project has no scene, and tells the link", () => {
			const h = createHarness({ floatingVisible: true, pageOpen: true });
			h.setScene(false);
			h.manager.onSceneChanged();
			expect(h.floatingVisible()).toBe(false);
			expect(h.pagesManager.closePage).toHaveBeenCalledWith("scene3d-view");
			expect(h.linkManager.onSceneChanged).toHaveBeenCalledTimes(1);
		});

		it("keeps the scene while the project still has one", () => {
			const h = createHarness({ floatingVisible: true, pageOpen: true });
			h.manager.onSceneChanged();
			expect(h.floatingVisible()).toBe(true);
			expect(h.pagesManager.closePage).not.toHaveBeenCalled();
			expect(h.linkManager.onSceneChanged).toHaveBeenCalledTimes(1);
		});
	});
});
