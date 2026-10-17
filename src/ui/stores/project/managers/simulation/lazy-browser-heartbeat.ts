import type { HeartbeatScheduler } from "@/lib/heartbeat/heartbeat-scheduler";

/**
 * Worker-driven heartbeat whose module is loaded on first use, since the worker is bundled
 * through `import.meta.url`. `undefined` where workers do not exist (tests, SSR), which leaves
 * the default `setInterval` clock.
 */
const lazyBrowserHeartbeat: HeartbeatScheduler | undefined =
	typeof Worker === "undefined"
		? undefined
		: (tick, intervalMs) => {
				let stop: (() => void) | null = null;
				let stopped = false;
				void import("@/lib/heartbeat/browser-heartbeat").then(
					({ browserHeartbeat }) => {
						if (!stopped) stop = browserHeartbeat(tick, intervalMs);
					},
				);
				return () => {
					stopped = true;
					stop?.();
				};
			};

export default lazyBrowserHeartbeat;
