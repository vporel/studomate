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

	constructor(private readonly host: Scene3dLinkHost) {}

	/**
	 * Opens (or focuses) the scene tab of this editor tab and connects to it. False when the
	 * browser blocked the tab: opening it again from a click on the page then succeeds.
	 */
	open(): boolean {
		const sessionId = this.host.getSessionId();
		this.connect(sessionId);
		const opened = this.host.openWindow(sessionId);
		this.channel?.send({ type: "ping" });
		return opened;
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
		this.pingTimer = setInterval(
			() => this.channel?.send({ type: "ping" }),
			PING_INTERVAL_MS,
		);
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
	}

	private handleMessage(message: SceneToEditorMessage): void {
		switch (message.type) {
			case "hello":
				this.lastPongAt = this.host.now();
				this.sendConfigAndState();
				break;
			case "interaction":
				this.host.sendInteraction(message.interaction);
				break;
			case "pong":
				this.lastPongAt = this.host.now();
				break;
			case "bye":
				this.lastPongAt = null;
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
