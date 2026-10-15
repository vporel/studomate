/** @jest-environment jsdom */

import type { ProjectStoreGetFunction } from "@/ui/stores/project/project.store.types";

const mockTrackEvent = jest.fn();
jest.mock("@/ui/services/analytics", () => ({
	__esModule: true,
	default: (...args: unknown[]) => mockTrackEvent(...args),
}));

const KEY = "studomate:3d-scene-session";
const getStore = (() => ({})) as unknown as ProjectStoreGetFunction;

type LockCallback = (lock: object | null) => unknown;

function installLocks(held: Set<string>) {
	const request = jest.fn((name: string, a: unknown, b?: unknown) => {
		const cb = (typeof a === "function" ? a : b) as LockCallback;
		const ifAvailable =
			typeof a === "object" && (a as { ifAvailable?: boolean }).ifAvailable;
		if (ifAvailable && held.has(name)) return Promise.resolve(cb(null));
		held.add(name);
		return Promise.resolve(cb({ name }));
	});
	Object.defineProperty(navigator, "locks", {
		value: { request },
		configurable: true,
	});
	return request;
}

function removeLocks() {
	Object.defineProperty(navigator, "locks", {
		value: undefined,
		configurable: true,
	});
}

async function loadHost() {
	let create!: typeof import("./browser-scene3d-link-host").default;
	await jest.isolateModulesAsync(async () => {
		create = (await import("./browser-scene3d-link-host")).default;
	});
	return create;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(() => {
	removeLocks();
	jest.restoreAllMocks();
});

describe("createBrowserScene3dLinkHost session id", () => {
	it("is stable across calls and across hosts of the same page", async () => {
		installLocks(new Set());
		const create = await loadHost();
		const first = create(getStore);
		const second = create(getStore);
		const id = first.getSessionId();
		await flush();
		expect(first.getSessionId()).toBe(id);
		expect(second.getSessionId()).toBe(id);
		expect(sessionStorage.getItem(KEY)).toBe(id);
	});

	it("reuses a stored id whose lock is free and requests its lock", async () => {
		sessionStorage.setItem(KEY, "stored-id");
		const request = installLocks(new Set());
		const host = (await loadHost())(getStore);
		await flush();
		expect(host.getSessionId()).toBe("stored-id");
		expect(request).toHaveBeenCalledTimes(1);
		expect(request.mock.calls[0][0]).toBe(`${KEY}:stored-id`);
	});

	it("replaces a stored id whose lock is held by another tab", async () => {
		sessionStorage.setItem(KEY, "dup-id");
		const request = installLocks(new Set([`${KEY}:dup-id`]));
		const host = (await loadHost())(getStore);
		await flush();
		const id = host.getSessionId();
		expect(id).not.toBe("dup-id");
		expect(sessionStorage.getItem(KEY)).toBe(id);
		expect(request.mock.calls.map((c) => c[0])).toEqual([
			`${KEY}:dup-id`,
			`${KEY}:${id}`,
		]);
	});

	it("keeps a stable in-memory id when sessionStorage throws", async () => {
		installLocks(new Set());
		jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
			throw new Error("denied");
		});
		jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("denied");
		});
		const host = (await loadHost())(getStore);
		const id = host.getSessionId();
		await flush();
		expect(id).toBeTruthy();
		expect(host.getSessionId()).toBe(id);
	});

	it("uses the stored id when navigator.locks is missing", async () => {
		sessionStorage.setItem(KEY, "stored-id");
		removeLocks();
		expect((await loadHost())(getStore).getSessionId()).toBe("stored-id");
	});

	it("creates and stores an id when navigator.locks is missing", async () => {
		removeLocks();
		const id = (await loadHost())(getStore).getSessionId();
		expect(id).toBeTruthy();
		expect(sessionStorage.getItem(KEY)).toBe(id);
	});

	it("builds the scene URL with the encoded session id", async () => {
		removeLocks();
		const open = jest.spyOn(window, "open").mockImplementation(() => null);
		(await loadHost())(getStore).openWindow("a b");
		expect(open.mock.calls[0][0]).toContain("session=a%20b");
		expect(open.mock.calls[0][1]).toBe("studomate-3d-scene-a b");
	});

	it("tracks the opening of the scene tab with the scene id", async () => {
		removeLocks();
		jest.spyOn(window, "open").mockImplementation(() => ({}) as Window);
		const store = (() => ({
			project: { scene3d: { sceneId: "carton-sorting", bindings: {} } },
		})) as unknown as ProjectStoreGetFunction;
		(await loadHost())(store).openWindow("s1");
		expect(mockTrackEvent).toHaveBeenCalledWith("scene-opened", {
			scene: "carton-sorting",
		});
	});

	it("reads the project name from the store, empty without a project", async () => {
		removeLocks();
		const withProject = (() => ({
			project: { name: "Mon projet" },
		})) as unknown as ProjectStoreGetFunction;
		const without = (() => ({
			project: null,
		})) as unknown as ProjectStoreGetFunction;
		const create = await loadHost();
		expect(create(withProject).getProjectName()).toBe("Mon projet");
		expect(create(without).getProjectName()).toBe("");
	});

	it("reports an opened tab, and tracks it", async () => {
		removeLocks();
		jest.spyOn(window, "open").mockImplementation(() => ({}) as Window);
		expect((await loadHost())(getStore).openWindow("s1")).toBe(true);
	});

	it("reports a blocked tab, and does not track an opening that did not happen", async () => {
		removeLocks();
		jest.spyOn(window, "open").mockImplementation(() => null);
		mockTrackEvent.mockClear();
		expect((await loadHost())(getStore).openWindow("s1")).toBe(false);
		expect(mockTrackEvent).not.toHaveBeenCalled();
	});
});
