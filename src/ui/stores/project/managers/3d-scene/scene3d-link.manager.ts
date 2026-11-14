import SceneChannel, {
	type SceneTransport,
} from "@/3d-scenes/link/scene-channel";
import type {
	EditorToSceneMessage,
	SceneToEditorMessage,
} from "@/3d-scenes/link/scene-messages";
import type { Scene3d } from "@/schemas/3d-scene/scene3d.schema";
import type { Scene3dStateSnapshot } from "./scene3d-simulation.bridge";

export const PING_INTERVAL_MS = 2000;
const CONNECTION_TIMEOUT_MS = 3 * PING_INTERVAL_MS;
/** A scene tab first loads the page and three.js, so its first answer may take a while. */
export const TAB_FIRST_ANSWER_TIMEOUT_MS = 15_000;

export interface Scene3dLinkHost {
	getScene(): Scene3d | null;
	getProjectName(): string;
	getSnapshot(): Scene3dStateSnapshot | null;
	subscribeState(
		listener: (snapshot: Scene3dStateSnapshot) => void,
	): () => void;
	sendInteraction(interaction: unknown): void;
	createTransport(sessionId: string): SceneTransport;
	/** Stable id of this editor tab, kept across a page reload. */
	getSessionId(): string;
	/** False when the browser refused to open the tab (blocked pop-up). */
	openWindow(sessionId: string): boolean;
	/**
	 * Hosts whose scene lives in the same page: the end of the link the scene reads, once the
	 * editor end of that session exists.
	 */
	connectScene?(sessionId: string): SceneTransport;
	now(): number;
}

/**
 * Editor side of the link with the 3D scene tab of a session: sends it the configuration and the
 * state of the model, and hands its interactions to the simulation.
 */
export default class Scene3dLinkManager {
	private channel: SceneChannel<
		EditorToSceneMessage,
		SceneToEditorMessage
	> | null = null;
	private unsubscribeState: (() => void) | null = null;
	private pingTimer: ReturnType<typeof setInterval> | null = null;
	private lastSentKey: string | null = null;
	private lastPongAt: number | null = null;
	private inline = false;
	private reportedConnected = false;
	private tabAwaitedSince: number | null = null;

	constructor(
		private readonly host: Scene3dLinkHost,
		private readonly listeners: {
			/** The scene tab asks to be shown in the editor's page. */
			onDockRequested?: () => void;
			/**
			 * The scene tab started or stopped answering, or never answered after it was opened,
			 * while the scene is not shown in the page.
			 */
			onTabConnectionChange?: (connected: boolean) => void;
		} = {},
	) {}

	/**
	 * Opens (or focuses) the scene tab of this editor tab and connects to it. False when the
	 * browser blocked the tab: opening it again from a click on the page then succeeds.
	 */
	open(): boolean {
		const sessionId = this.host.getSessionId();
		this.connect(sessionId);
		const opened = this.host.openWindow(sessionId);
		if (opened) {
			this.inline = false;
			if (!this.isSceneConnected()) this.tabAwaitedSince = this.host.now();
		}
		this.channel?.send({ type: "ping" });
		return opened;
	}

	/**
	 * Connects the editor to a scene shown in this very page, and returns the end of the link the
	 * scene has to read.
	 */
	openInline(): SceneTransport {
		const { connectScene } = this.host;
		if (!connectScene) {
			throw new Error("This host cannot show the scene in the page");
		}
		const sessionId = this.host.getSessionId();
		this.connect(sessionId);
		this.inline = true;
		return connectScene.call(this.host, sessionId);
	}

	/**
	 * Ends the link of a scene shown in the page. A scene tab opened since then keeps the link:
	 * the page's view is torn down after the tab was requested.
	 */
	releaseInline(): void {
		if (!this.inline) return;
		this.disconnect();
	}

	/** True while the scene tab answers the pings. */
	isSceneConnected(): boolean {
		return (
			this.lastPongAt !== null &&
			this.host.now() - this.lastPongAt <= CONNECTION_TIMEOUT_MS
		);
	}

	/** Tells the scene tab to close itself, then forgets it. */
	close(): void {
		if (!this.channel) return;
		this.channel.send({ type: "close" });
		this.disconnect();
	}

	/** To call when the scene or the name of the project changed. */
	onSceneChanged(): void {
		if (!this.channel) return;
		if (!this.host.getScene()) {
			this.close();
			return;
		}
		this.sendConfigAndState();
	}

	private connect(sessionId: string): void {
		if (this.channel) return;
		const channel = new SceneChannel<
			EditorToSceneMessage,
			SceneToEditorMessage
		>(this.host.createTransport(sessionId));
		this.channel = channel;
		channel.onMessage((message) => this.handleMessage(message));
		this.unsubscribeState = this.host.subscribeState((snapshot) =>
			this.sendState(snapshot),
		);
		this.pingTimer = setInterval(() => {
			this.channel?.send({ type: "ping" });
			this.reportConnection();
		}, PING_INTERVAL_MS);
	}

	private disconnect(): void {
		this.unsubscribeState?.();
		this.unsubscribeState = null;
		if (this.pingTimer) clearInterval(this.pingTimer);
		this.pingTimer = null;
		this.channel?.close();
		this.channel = null;
		this.lastSentKey = null;
		this.lastPongAt = null;
		this.inline = false;
		this.reportedConnected = false;
		this.tabAwaitedSince = null;
	}

	private reportConnection(): void {
		if (this.inline) return;
		const connected = this.isSceneConnected();
		if (connected) this.tabAwaitedSince = null;
		else if (
			this.tabAwaitedSince !== null &&
			this.host.now() - this.tabAwaitedSince > TAB_FIRST_ANSWER_TIMEOUT_MS
		) {
			this.tabAwaitedSince = null;
			this.listeners.onTabConnectionChange?.(false);
			return;
		}
		if (connected === this.reportedConnected) return;
		this.reportedConnected = connected;
		this.listeners.onTabConnectionChange?.(connected);
	}

	private handleMessage(message: SceneToEditorMessage): void {
		switch (message.type) {
			case "hello":
				this.lastPongAt = this.host.now();
				this.sendConfigAndState();
				this.reportConnection();
				break;
			case "interaction":
				this.host.sendInteraction(message.interaction);
				break;
			case "pong":
				this.lastPongAt = this.host.now();
				this.reportConnection();
				break;
			case "bye":
				this.lastPongAt = null;
				this.reportConnection();
				break;
			case "dock-request":
				this.listeners.onDockRequested?.();
				break;
		}
	}

	private sendConfigAndState(): void {
		const scene = this.host.getScene();
		if (!scene || !this.channel) return;
		this.channel.send({
			type: "config",
			sceneId: scene.sceneId,
			sceneVersion: scene.sceneVersion,
			projectName: this.host.getProjectName(),
		});
		this.lastSentKey = null;
		const snapshot = this.host.getSnapshot();
		if (snapshot) this.sendState(snapshot);
	}

	private sendState(snapshot: Scene3dStateSnapshot): void {
		if (!this.channel) return;
		const key = JSON.stringify([
			snapshot.sceneId,
			snapshot.sceneVersion,
			snapshot.status,
			snapshot.state,
		]);
		if (key === this.lastSentKey) return;
		this.lastSentKey = key;
		this.channel.send({ type: "state", ...snapshot });
	}
}
