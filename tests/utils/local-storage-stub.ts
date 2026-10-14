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
