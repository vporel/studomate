import {
	createMemoryStorage,
	installMemoryLocalStorage,
	stubLocalStorage,
} from "@tests/utils/local-storage-stub";

describe("stubLocalStorage", () => {
	it("installs the stub and restores the original state, idempotently", () => {
		const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
		const restore = stubLocalStorage({ getItem: () => "stubbed" });
		expect(globalThis.localStorage.getItem("k")).toBe("stubbed");

		restore();
		restore();
		expect(Object.getOwnPropertyDescriptor(globalThis, "localStorage")).toEqual(
			before,
		);
	});
});

describe("createMemoryStorage", () => {
	it("reads, writes and removes items", () => {
		const storage = createMemoryStorage();
		expect(storage.getItem("a")).toBeNull();
		storage.setItem("a", "1");
		expect(storage.getItem("a")).toBe("1");
		expect(storage.store.get("a")).toBe("1");
		storage.removeItem("a");
		expect(storage.getItem("a")).toBeNull();
	});

	it("clears, counts and indexes items", () => {
		const storage = createMemoryStorage();
		storage.setItem("a", "1");
		storage.setItem("b", "2");
		expect(storage.length).toBe(2);
		expect(storage.key(0)).toBe("a");
		expect(storage.key(1)).toBe("b");
		expect(storage.key(2)).toBeNull();
		storage.clear();
		expect(storage.length).toBe(0);
	});

	it("leaves the store untouched when the setItem hook throws", () => {
		const storage = createMemoryStorage({
			onSetItem: (key) => {
				if (key === "bad") throw new Error("quota");
			},
		});
		storage.setItem("ok", "1");
		expect(() => storage.setItem("bad", "2")).toThrow("quota");
		expect(storage.getItem("bad")).toBeNull();
		expect(storage.getItem("ok")).toBe("1");
	});
});

describe("installMemoryLocalStorage", () => {
	it("installs a memory localStorage and restores the original state", () => {
		const before = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
		const { storage, store, restore } = installMemoryLocalStorage();

		localStorage.setItem("k", "v");
		expect(store.get("k")).toBe("v");
		expect(globalThis.localStorage).toBe(storage);

		restore();
		expect(Object.getOwnPropertyDescriptor(globalThis, "localStorage")).toEqual(
			before,
		);
	});

	it("forwards the setItem hook", () => {
		const onSetItem = jest.fn();
		const { restore } = installMemoryLocalStorage({ onSetItem });
		localStorage.setItem("k", "v");
		expect(onSetItem).toHaveBeenCalledWith("k", "v");
		restore();
	});
});
