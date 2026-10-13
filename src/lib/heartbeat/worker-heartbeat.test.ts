import { createWorkerHeartbeat } from "./worker-heartbeat";

function fakeWorker() {
	return {
		postMessage: jest.fn(),
		terminate: jest.fn(),
		onmessage: null as null | ((event: MessageEvent) => void),
	};
}

describe("createWorkerHeartbeat", () => {
	it("starts the worker with the interval and ticks on each message", () => {
		const worker = fakeWorker();
		const tick = jest.fn();

		createWorkerHeartbeat(() => worker)(tick, 150);
		expect(worker.postMessage).toHaveBeenCalledWith({
			type: "start",
			intervalMs: 150,
		});

		worker.onmessage!({ data: "tick" } as MessageEvent);
		worker.onmessage!({ data: "tick" } as MessageEvent);
		expect(tick).toHaveBeenCalledTimes(2);
	});

	it("stops and terminates the worker", () => {
		const worker = fakeWorker();

		const stop = createWorkerHeartbeat(() => worker)(jest.fn(), 150);
		stop();

		expect(worker.postMessage).toHaveBeenLastCalledWith({ type: "stop" });
		expect(worker.terminate).toHaveBeenCalled();
	});
});
