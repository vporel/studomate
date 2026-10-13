export const SCENE_PROTOCOL_VERSION = 1;

export type SceneSimulationStatus = "stopped" | "running" | "paused";

/** Editor tab → scene tab. */
export type EditorToSceneMessage =
	| { type: "config"; sceneId: string }
	| {
			type: "state";
			sceneId: string;
			state: unknown;
			simTimeMs: number;
			status: SceneSimulationStatus;
	  }
	| { type: "close" }
	| { type: "ping" };

/** Scene tab → editor tab. */
export type SceneToEditorMessage =
	| { type: "hello" }
	| { type: "interaction"; interaction: unknown }
	| { type: "pong" }
	| { type: "bye" };

export type SceneMessage = EditorToSceneMessage | SceneToEditorMessage;

export type SceneEnvelope<M extends SceneMessage = SceneMessage> = M & {
	protocolVersion: number;
};

const MESSAGE_TYPES: readonly SceneMessage["type"][] = [
	"config",
	"state",
	"close",
	"ping",
	"hello",
	"interaction",
	"pong",
	"bye",
];

export function toEnvelope<M extends SceneMessage>(
	message: M,
): SceneEnvelope<M> {
	return { ...message, protocolVersion: SCENE_PROTOCOL_VERSION };
}

/** The message carried by `raw`, or `null` when it is not a message of this protocol version. */
export function parseSceneMessage(raw: unknown): SceneMessage | null {
	if (typeof raw !== "object" || raw === null) return null;
	const candidate = raw as { protocolVersion?: unknown; type?: unknown };
	if (candidate.protocolVersion !== SCENE_PROTOCOL_VERSION) return null;
	if (!MESSAGE_TYPES.includes(candidate.type as SceneMessage["type"])) {
		return null;
	}
	const { protocolVersion: _version, ...message } = raw as SceneEnvelope;
	return message as SceneMessage;
}
