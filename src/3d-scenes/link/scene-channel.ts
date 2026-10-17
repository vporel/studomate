import {
	type SceneMessage,
	parseSceneMessage,
	toEnvelope,
} from "./scene-messages";

/** Minimal shape of a `BroadcastChannel`, so that tests run without a browser. */
export interface SceneTransport {
	postMessage(data: unknown): void;
	onmessage: ((event: { data: unknown }) => void) | null;
	close(): void;
}

export const SCENE_CHANNEL_PREFIX = "studomate:3d-scene:";

export function createBrowserSceneTransport(sessionId: string): SceneTransport {
	const channel = new BroadcastChannel(`${SCENE_CHANNEL_PREFIX}${sessionId}`);
	const transport: SceneTransport = {
		postMessage: (data) => channel.postMessage(data),
		onmessage: null,
		close: () => channel.close(),
	};
	channel.onmessage = (event) => transport.onmessage?.({ data: event.data });
	return transport;
}

/** Typed, versioned messages over a transport shared by the two tabs of a session. */
export default class SceneChannel<
	Sent extends SceneMessage,
	Received extends SceneMessage,
> {
	constructor(private readonly transport: SceneTransport) {}

	send(message: Sent): void {
		this.transport.postMessage(toEnvelope(message));
	}

	/** Messages of another protocol version, or not of the protocol, are dropped. */
	onMessage(handler: (message: Received) => void): void {
		this.transport.onmessage = (event) => {
			const message = parseSceneMessage(event.data);
			if (message) handler(message as Received);
		};
	}

	close(): void {
		this.transport.onmessage = null;
		this.transport.close();
	}
}
