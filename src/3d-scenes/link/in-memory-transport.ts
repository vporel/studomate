import type { SceneTransport } from "./scene-channel";

/**
 * The two ends of a link kept in memory, for a scene shown in the same page as its editor.
 * Like a `BroadcastChannel`, a message reaches the other end asynchronously, structurally cloned;
 * one posted before the other end listens is held until it does.
 */
export function createInMemoryTransportPair(): [
	SceneTransport,
	SceneTransport,
] {
	const ends: [InMemoryEnd, InMemoryEnd] = [
		new InMemoryEnd(),
		new InMemoryEnd(),
	];
	ends[0].peer = ends[1];
	ends[1].peer = ends[0];
	return ends;
}

class InMemoryEnd implements SceneTransport {
	peer: InMemoryEnd | null = null;
	private handler: SceneTransport["onmessage"] = null;
	private pending: unknown[] = [];
	private closed = false;

	get onmessage(): SceneTransport["onmessage"] {
		return this.handler;
	}

	set onmessage(handler: SceneTransport["onmessage"]) {
		this.handler = handler;
		if (handler) this.flush();
	}

	postMessage(data: unknown): void {
		if (this.closed) return;
		this.peer?.receive(structuredClone(data));
	}

	close(): void {
		this.closed = true;
		this.handler = null;
		this.pending = [];
		this.peer = null;
	}

	private receive(data: unknown): void {
		if (this.closed) return;
		this.pending.push(data);
		queueMicrotask(() => this.flush());
	}

	private flush(): void {
		while (this.handler && this.pending.length > 0) {
			this.handler({ data: this.pending.shift() });
		}
	}
}
