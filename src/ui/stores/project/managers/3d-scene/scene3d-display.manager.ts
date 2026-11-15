import { Scene3dDisplayMode } from "@/ui/stores/project/scene3d-display-mode.enum";
import type { ProjectStoreEnvironment } from "@/ui/stores/project/environment/project-store-environment";
import { SCENE3D_VIEW_PAGE_DATA } from "@/ui/stores/project/pages-data";
import type {
	ProjectStoreGetFunction,
	ProjectStoreSetFunction,
	ProjectStoreState,
} from "@/ui/stores/project/project.store.types";

/** What `Scene3dDisplayManager` needs from the environment. */
export type Scene3dDisplayManagerEnvironment = Pick<
	ProjectStoreEnvironment,
	"analytics" | "preferences" | "simulationNotifier" | "scene3dDisplay"
>;

/**
 * The mode in which the scene is shown right now, `null` when it is shown nowhere. A page of the
 * scene in the background shows nothing: its scene is only mounted while the page is active.
 */
export function selectScene3dShownMode(
	state: Pick<ProjectStoreState, "ui" | "pagesData" | "activePageId">,
): Scene3dDisplayMode | null {
	if (state.ui.scene3dSidePanelVisible) return Scene3dDisplayMode.SIDE_PANEL;
	if (state.ui.scene3dFloatingVisible) return Scene3dDisplayMode.FLOATING_BOX;
	if (
		state.activePageId &&
		state.pagesData[state.activePageId]?.type === "scene3d-view"
	)
		return Scene3dDisplayMode.PAGE;
	return state.ui.scene3dBrowserTabOpen ? Scene3dDisplayMode.BROWSER_TAB : null;
}

/**
 * The mode the user chose when the environment offers it, the environment's default otherwise.
 */
export function resolveScene3dDisplayMode(
	env: Pick<ProjectStoreEnvironment, "preferences" | "scene3dDisplay">,
): Scene3dDisplayMode {
	const { availableModes, defaultMode } = env.scene3dDisplay;
	const chosen = env.preferences.getScene3dDisplayMode();
	return chosen && availableModes.includes(chosen) ? chosen : defaultMode;
}

/** The modes whose scene is shown by a flag of the UI state rather than by a page. */
const FRAME_FLAGS = {
	[Scene3dDisplayMode.SIDE_PANEL]: "scene3dSidePanelVisible",
	[Scene3dDisplayMode.FLOATING_BOX]: "scene3dFloatingVisible",
} as const;

type FrameMode = keyof typeof FRAME_FLAGS;

function isFrameMode(mode: Scene3dDisplayMode): mode is FrameMode {
	return Object.hasOwn(FRAME_FLAGS, mode);
}

/**
 * Where the 3D scene is shown, one place at a time: a panel on the right of the editors
 * (`side-panel`), a tab of the editor (`page`), a frame over the editors (`floating-box`) or a
 * browser tab (`browser-tab`). The environment tells which
 * modes exist; the one last chosen is remembered and used wherever the scene is opened.
 */
export default class Scene3dDisplayManager {
	constructor(
		private readonly setStoreState: ProjectStoreSetFunction,
		private readonly getStoreState: ProjectStoreGetFunction,
		private readonly env: Scene3dDisplayManagerEnvironment,
	) {}

	get availableModes(): readonly Scene3dDisplayMode[] {
		return this.env.scene3dDisplay.availableModes;
	}

	/** Shows the scene in the current mode. False when the browser blocked the browser tab. */
	open(): boolean {
		return this.display(this.getStoreState().ui.scene3dDisplayMode);
	}

	/**
	 * Closes the scene when it is shown, brings its page forward when it is in the background,
	 * shows it in the current mode otherwise.
	 */
	toggle(): void {
		if (selectScene3dShownMode(this.getStoreState())) this.close();
		else if (this.scenePageIds().length > 0) this.openScenePage();
		else this.open();
	}

	/** Shows the scene in `mode` and makes it the current mode. False when it could not be shown. */
	show(mode: Scene3dDisplayMode): boolean {
		if (!this.availableModes.includes(mode)) return false;
		if (!this.display(mode)) return false;
		this.env.preferences.setScene3dDisplayMode(mode);
		this.setMode(mode);
		return true;
	}

	/** Brings the scene of a browser tab back in the editor, in the first mode that shows it there. */
	dock(): void {
		const { defaultMode } = this.env.scene3dDisplay;
		const inEditor: Scene3dDisplayMode[] = this.availableModes.filter(
			(mode) => mode !== Scene3dDisplayMode.BROWSER_TAB,
		);
		const target = inEditor.includes(defaultMode) ? defaultMode : inEditor[0];
		if (target) this.show(target);
	}

	/** Shows the scene nowhere. */
	close(): void {
		this.hideInEditor();
		this.setBrowserTabOpen(false);
		this.getStoreState().scene3dLinkManager.close();
	}

	/** To call when the browser tab of the scene starts or stops answering. */
	onBrowserTabConnectionChange(connected: boolean): void {
		this.setBrowserTabOpen(connected);
	}

	/** To call when the scene or the name of the project changed. */
	onSceneChanged(): void {
		const { project, scene3dLinkManager } = this.getStoreState();
		if (!project?.scene3d) {
			this.hideInEditor();
			this.setBrowserTabOpen(false);
		}
		scene3dLinkManager.onSceneChanged();
	}

	private display(mode: Scene3dDisplayMode): boolean {
		const { scene3dLinkManager } = this.getStoreState();
		if (mode === Scene3dDisplayMode.BROWSER_TAB) {
			if (!scene3dLinkManager.open()) {
				this.env.simulationNotifier.scene3dOpenBlocked(() => this.show(mode));
				return false;
			}
			this.hideInEditor();
			this.setBrowserTabOpen(true);
			return true;
		}
		const shownAlready = isFrameMode(mode)
			? this.getStoreState().ui[FRAME_FLAGS[mode]]
			: this.scenePageIds().length > 0;
		this.hideInEditor(mode);
		if (!shownAlready) {
			scene3dLinkManager.close();
			this.setBrowserTabOpen(false);
			this.env.analytics.trackEvent("scene-opened", {
				scene: this.getStoreState().project?.scene3d?.sceneId,
				mode,
			});
		}
		if (isFrameMode(mode)) this.setFrameVisible(mode, true);
		else this.openScenePage();
		return true;
	}

	/** Hides the scene everywhere in the editor, except in `kept`. */
	private hideInEditor(kept?: Scene3dDisplayMode): void {
		for (const mode of Object.keys(FRAME_FLAGS) as FrameMode[]) {
			if (mode !== kept) this.setFrameVisible(mode, false);
		}
		if (kept !== Scene3dDisplayMode.PAGE) this.closeScenePages();
	}

	private setMode(mode: Scene3dDisplayMode): void {
		this.setStoreState((state) =>
			state.ui.scene3dDisplayMode === mode
				? state
				: { ui: { ...state.ui, scene3dDisplayMode: mode } },
		);
	}

	private setBrowserTabOpen(open: boolean): void {
		this.setStoreState((state) =>
			state.ui.scene3dBrowserTabOpen === open
				? state
				: { ui: { ...state.ui, scene3dBrowserTabOpen: open } },
		);
	}

	private setFrameVisible(mode: FrameMode, visible: boolean): void {
		const flag = FRAME_FLAGS[mode];
		this.setStoreState((state) =>
			state.ui[flag] === visible
				? state
				: { ui: { ...state.ui, [flag]: visible } },
		);
	}

	private scenePageIds(): string[] {
		return Object.values(this.getStoreState().pagesData)
			.filter((page) => page.type === "scene3d-view")
			.map((page) => page.id);
	}

	private openScenePage(): void {
		const { pagesManager, pagesData } = this.getStoreState();
		const [existingId] = this.scenePageIds();
		pagesManager.openPage(
			existingId ? pagesData[existingId] : SCENE3D_VIEW_PAGE_DATA,
		);
	}

	private closeScenePages(): void {
		const { pagesManager } = this.getStoreState();
		this.scenePageIds().forEach((id) => pagesManager.closePage(id));
	}
}
