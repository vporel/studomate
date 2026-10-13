import { createWorkerHeartbeat } from "./worker-heartbeat";

/** Heartbeat of the real application, driven by `heartbeat.worker.ts`. */
export const browserHeartbeat = createWorkerHeartbeat(
	() => new Worker(new URL("./heartbeat.worker.ts", import.meta.url)),
);
