import type { SceneTransport } from "@/3d-scenes/link/scene-channel";

/** Two linked in-memory transports, like the two ends of a `BroadcastChannel`. */
export function createTransportPair(): [SceneTransport, SceneTransport] {
	const a: SceneTransport = {
		onmessage: null,
		postMessage: (data) => b.onmessage?.({ data: structuredClone(data) }),
		close: jest.fn(),
	};
	const b: SceneTransport = {
		onmessage: null,
		postMessage: (data) => a.onmessage?.({ data: structuredClone(data) }),
		close: jest.fn(),
	};
	return [a, b];
}
