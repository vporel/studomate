import type { HeartbeatScheduler } from "./heartbeat-scheduler";

export type HeartbeatWorker = Pick<
	Worker,
	"postMessage" | "terminate" | "onmessage"
>;

/**
 * Heartbeat cadenced by a dedicated worker. The worker ends with the page, so closing the tab
 * stops the heartbeat and lets the firmware watchdog drive the outputs to their fallback state.
 */
export function createWorkerHeartbeat(
	createWorker: () => HeartbeatWorker,
): HeartbeatScheduler {
	return (tick, intervalMs) => {
		const worker = createWorker();
		worker.onmessage = () => tick();
		worker.postMessage({ type: "start", intervalMs });
		return () => {
			worker.postMessage({ type: "stop" });
			worker.terminate();
		};
	};
}
