import SceneChannel, {
	type SceneTransport,
} from "@/3d-scenes/link/scene-channel";
import {
	EDITOR_TO_SCENE_TYPES,
	type EditorToSceneMessage,
	type SceneMessage,
	type SceneSimulationStatus,
	type SceneToEditorMessage,
} from "@/3d-scenes/link/scene-messages";
import StateInterpolator from "@/3d-scenes/state-interpolator";

export type SceneViewPhase =
	| "waiting"
	| "stopped"
	| "running"
	| "paused"
	| "editor-closed"
	| "protocol-mismatch";

export type SceneViewSnapshot = {
	phase: SceneViewPhase;
	sceneId: string | null;
	sceneVersion: number | null;
	projectName: string | null;
};

type Lerp = (from: unknown, to: unknown, ratio: number) => unknown;

export const EDITOR_SILENCE_TIMEOUT_MS = 6000;
const WATCH_INTERVAL_MS = 1000;

export interface SceneViewDeps {
	transport: SceneTransport;
	now(): number;
	/** Interpolation of the states of a scene; absent for a scene unknown to this version. */
	getLerp(sceneId: string, sceneVersion: number): Lerp | undefined;
	onClose(): void;
}

/**
 * Scene tab side of the link: holds the connection, the latest state received from the editor
 * and the phase to display. It holds no physics and no simulation clock.
 */
export default class SceneView {
	private readonly channel: SceneChannel<
		SceneToEditorMessage,
		EditorToSceneMessage
	>;
	private interpolator: StateInterpolator<unknown> | null = null;
	private snapshot: SceneViewSnapshot = {
		phase: "waiting",
		sceneId: null,
		sceneVersion: null,
		projectName: null,
	};
	private lastSeenAt: number;
	private readonly listeners = new Set<() => void>();
	private readonly watchTimer: ReturnType<typeof setInterval>;

	constructor(private readonly deps: SceneViewDeps) {
		this.lastSeenAt = deps.now();
		this.channel = new SceneChannel(deps.transport);
		this.channel.onMessage(
			(message) => this.handleMessage(message),
			(type) => this.handleForeignVersion(type),
		);
		this.watchTimer = setInterval(() => this.watchEditor(), WATCH_INTERVAL_MS);
		this.channel.send({ type: "hello" });
	}

	getSnapshot = (): SceneViewSnapshot => this.snapshot;

	subscribe = (listener: () => void): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};

	/** Latest state of the model, blended for the current frame. */
	sampleState(): unknown {
		return this.interpolator?.sample(this.deps.now()) ?? null;
	}

	/** Forwards an interaction of the user; ignored unless the simulation is running or paused. */
	sendInteraction(interaction: unknown): void {
		const { phase } = this.snapshot;
		if (phase !== "running" && phase !== "paused") return;
		this.channel.send({ type: "interaction", interaction });
	}

	dispose(): void {
		clearInterval(this.watchTimer);
		this.channel.send({ type: "bye" });
		this.channel.close();
		this.listeners.clear();
	}

	/** Another scene tab may share the channel: only the editor's messages tell about the editor. */
	private isFromEditor(type: SceneMessage["type"]): boolean {
		return (EDITOR_TO_SCENE_TYPES as readonly string[]).includes(type);
	}

	private handleForeignVersion(type: SceneMessage["type"]): void {
		if (!this.isFromEditor(type)) return;
		this.lastSeenAt = this.deps.now();
		this.setPhase("protocol-mismatch");
	}

	private handleMessage(message: EditorToSceneMessage): void {
		if (!this.isFromEditor(message.type)) return;
		const { phase } = this.snapshot;
		const wasDisconnected =
			phase === "editor-closed" || phase === "protocol-mismatch";
		if (phase === "protocol-mismatch") this.setPhase("waiting");
		this.lastSeenAt = this.deps.now();
		switch (message.type) {
			case "config":
				this.useScene(message.sceneId, message.sceneVersion);
				this.setProjectName(message.projectName);
				break;
			case "state":
				this.useScene(message.sceneId, message.sceneVersion);
				this.interpolator?.push(
					{ simTimeMs: message.simTimeMs, state: message.state },
					this.deps.now(),
				);
				this.setPhase(message.status satisfies SceneSimulationStatus);
				break;
			case "ping":
				this.channel.send({ type: "pong" });
				if (wasDisconnected) this.channel.send({ type: "hello" });
				break;
			case "close":
				this.deps.onClose();
				break;
		}
	}

	private useScene(sceneId: string, sceneVersion: number): void {
		if (
			this.snapshot.sceneId === sceneId &&
			this.snapshot.sceneVersion === sceneVersion
		) {
			return;
		}
		const lerp = this.deps.getLerp(sceneId, sceneVersion);
		this.interpolator = lerp ? new StateInterpolator(lerp) : null;
		this.update({ ...this.snapshot, sceneId, sceneVersion });
	}

	private setProjectName(projectName: string): void {
		if (this.snapshot.projectName === projectName) return;
		this.update({ ...this.snapshot, projectName });
	}

	private setPhase(phase: SceneViewPhase): void {
		if (this.snapshot.phase === phase) return;
		this.update({ ...this.snapshot, phase });
	}

	private watchEditor(): void {
		const silent =
			this.deps.now() - this.lastSeenAt > EDITOR_SILENCE_TIMEOUT_MS;
		const { phase } = this.snapshot;
		if (silent && phase !== "editor-closed" && phase !== "protocol-mismatch") {
			this.setPhase("editor-closed");
		}
	}

	private update(next: SceneViewSnapshot): void {
		this.snapshot = next;
		this.listeners.forEach((listener) => listener());
	}
}
