import type { HeartbeatScheduler } from "@/lib/heartbeat/heartbeat-scheduler";

const innerStop = jest.fn();
const browserHeartbeat = jest.fn(
	(_tick: () => void, _intervalMs: number) => innerStop,
);

jest.mock("@/lib/heartbeat/browser-heartbeat", () => ({
	browserHeartbeat: (tick: () => void, intervalMs: number) =>
		browserHeartbeat(tick, intervalMs),
}));

const flush = () => new Promise((r) => setTimeout(r, 0));

async function loadWith(
	worker: unknown,
): Promise<HeartbeatScheduler | undefined> {
	(globalThis as { Worker?: unknown }).Worker = worker;
	if (worker === undefined) delete (globalThis as { Worker?: unknown }).Worker;
	let loaded: HeartbeatScheduler | undefined;
	await jest.isolateModulesAsync(async () => {
		loaded = (await import("./lazy-browser-heartbeat")).default;
	});
	return loaded;
}

describe("lazyBrowserHeartbeat", () => {
	const originalWorker = (globalThis as { Worker?: unknown }).Worker;

	beforeEach(() => {
		innerStop.mockClear();
		browserHeartbeat.mockClear();
	});

	afterEach(() => {
		if (originalWorker === undefined) {
			delete (globalThis as { Worker?: unknown }).Worker;
		} else {
			(globalThis as { Worker?: unknown }).Worker = originalWorker;
		}
	});

	it("is undefined where workers do not exist", async () => {
		expect(await loadWith(undefined)).toBeUndefined();
	});

	it("starts the browser heartbeat with the same tick and interval once loaded", async () => {
		const scheduler = await loadWith(class {});
		const tick = jest.fn();

		scheduler!(tick, 25);
		await flush();

		expect(browserHeartbeat).toHaveBeenCalledTimes(1);
		expect(browserHeartbeat).toHaveBeenCalledWith(tick, 25);
	});

	it("never starts the browser heartbeat when stopped before the module loaded", async () => {
		const scheduler = await loadWith(class {});

		const stop = scheduler!(jest.fn(), 25);
		stop();
		await flush();

		expect(browserHeartbeat).not.toHaveBeenCalled();
		expect(innerStop).not.toHaveBeenCalled();
	});

	it("stops the browser heartbeat exactly once when stopped after it started", async () => {
		const scheduler = await loadWith(class {});

		const stop = scheduler!(jest.fn(), 25);
		await flush();
		stop();

		expect(innerStop).toHaveBeenCalledTimes(1);
	});
});
