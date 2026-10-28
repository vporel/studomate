/** Replaces `globalThis.localStorage` with `storage` and returns a function restoring the original descriptor. */
export function stubLocalStorage(storage: Partial<Storage>): () => void {
	const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
	Object.defineProperty(globalThis, "localStorage", {
		value: storage,
		configurable: true,
		writable: true,
	});
	return () => {
		if (original) Object.defineProperty(globalThis, "localStorage", original);
		else delete (globalThis as { localStorage?: Storage }).localStorage;
	};
}

export type MemoryStorageOptions = {
	/** Runs before each write; may throw to simulate a failing storage. */
	onSetItem?: (key: string, value: string) => void;
};

export type MemoryStorage = Storage & { store: Map<string, string> };

/** In-memory `Storage` backed by an exposed `Map`. */
export function createMemoryStorage(
	options: MemoryStorageOptions = {},
): MemoryStorage {
	const store = new Map<string, string>();
	return {
		store,
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			options.onSetItem?.(key, value);
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => store.clear(),
		get length() {
			return store.size;
		},
		key: (index: number) => [...store.keys()][index] ?? null,
	};
}

/** Installs a fresh in-memory `localStorage`; `restore` puts the original back. */
export function installMemoryLocalStorage(options: MemoryStorageOptions = {}) {
	const storage = createMemoryStorage(options);
	const restore = stubLocalStorage(storage);
	return { storage, store: storage.store, restore };
}
