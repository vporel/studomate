import handleNavigation, {
	type NetworkOutcome,
} from "@/offline/handle-navigation";

const TIMEOUT = 3000;

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const fakeResponse = (name: string) => ({ name }) as unknown as Response;

describe("handleNavigation", () => {
	let errorResponse: Response;

	beforeEach(() => {
		jest.useFakeTimers();
		errorResponse = fakeResponse("error");
		(globalThis as unknown as { Response: unknown }).Response = {
			error: () => errorResponse,
		};
	});

	afterEach(() => {
		jest.useRealTimers();
		delete (globalThis as unknown as { Response?: unknown }).Response;
	});

	it("returns a usable network page without consulting the precache", async () => {
		const response = fakeResponse("network");
		const matchPrecache = jest.fn();
		const result = await handleNavigation(
			"/a",
			async () => ({ kind: "page", response }),
			matchPrecache,
			TIMEOUT,
		);
		expect(result).toBe(response);
		expect(matchPrecache).not.toHaveBeenCalled();
	});

	it("falls back to the precache when the network is slow", async () => {
		const net = deferred<NetworkOutcome>();
		const cached = fakeResponse("cached");
		const matchPrecache = jest.fn().mockResolvedValue(cached);
		const promise = handleNavigation(
			"/a",
			() => net.promise,
			matchPrecache,
			TIMEOUT,
		);
		await jest.advanceTimersByTimeAsync(TIMEOUT);
		expect(await promise).toBe(cached);
		expect(matchPrecache).toHaveBeenCalledWith("/a");
	});

	it("waits for the network when slow and nothing is precached", async () => {
		const net = deferred<NetworkOutcome>();
		const response = fakeResponse("late");
		const promise = handleNavigation(
			"/a",
			() => net.promise,
			async () => undefined,
			TIMEOUT,
		);
		await jest.advanceTimersByTimeAsync(TIMEOUT);
		net.resolve({ kind: "page", response });
		expect(await promise).toBe(response);
	});

	it("returns Response.error() when slow, nothing precached and the network is unusable", async () => {
		const net = deferred<NetworkOutcome>();
		const promise = handleNavigation(
			"/a",
			() => net.promise,
			async () => undefined,
			TIMEOUT,
		);
		await jest.advanceTimersByTimeAsync(TIMEOUT);
		net.resolve({ kind: "unusable" });
		expect(await promise).toBe(errorResponse);
	});

	it("falls back to the precache when the network fails fast", async () => {
		const cached = fakeResponse("cached");
		const result = await handleNavigation(
			"/a",
			async () => ({ kind: "unusable" }),
			async () => cached,
			TIMEOUT,
		);
		expect(result).toBe(cached);
	});

	it("returns Response.error() when the network fails and nothing is precached", async () => {
		const result = await handleNavigation(
			"/a",
			async () => ({ kind: "unusable" }),
			async () => undefined,
			TIMEOUT,
		);
		expect(result).toBe(errorResponse);
	});

	it.each(["404", "opaque redirect"])(
		"returns a passthrough response (%s) as is, without the precache",
		async (name) => {
			const response = fakeResponse(name);
			const matchPrecache = jest.fn();
			const result = await handleNavigation(
				"/a",
				async () => ({ kind: "passthrough", response }),
				matchPrecache,
				TIMEOUT,
			);
			expect(result).toBe(response);
			expect(matchPrecache).not.toHaveBeenCalled();
		},
	);

	it("treats an unexpected page (unusable) as a reason to use the precache", async () => {
		const cached = fakeResponse("cached");
		const result = await handleNavigation(
			"/a",
			async () => ({ kind: "unusable" }),
			async () => cached,
			TIMEOUT,
		);
		expect(result).toBe(cached);
	});
});
