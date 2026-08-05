import {
	deepMerge,
	deepObjectsComparison,
	extractFields,
	getKeysDeepJoined,
	invertRecord,
} from "./object";

describe("invertRecord", () => {
	it("swaps keys and values", () => {
		const record = { a: "1", b: "2", c: "3" };
		expect(invertRecord(record)).toEqual({ "1": "a", "2": "b", "3": "c" });
	});

	it("handles an empty record", () => {
		expect(invertRecord({})).toEqual({});
	});
});

describe("deepMerge", () => {
	it("overrides target keys with source keys", () => {
		expect(deepMerge({ a: 1, b: 2 }, { b: 3 })).toEqual({ a: 1, b: 3 });
	});

	it("merges nested objects recursively instead of replacing them wholesale", () => {
		const target = { user: { name: "Alice", age: 30 } };
		const source = { user: { age: 31 } };
		expect(deepMerge(target, source)).toEqual({ user: { name: "Alice", age: 31 } });
	});

	it("creates missing nested objects on the target", () => {
		const target: { user?: { age: number } } = {};
		expect(deepMerge(target, { user: { age: 20 } })).toEqual({ user: { age: 20 } });
	});

	it("replaces arrays wholesale instead of merging them element-wise", () => {
		expect(deepMerge({ items: [1, 2, 3] }, { items: [4] })).toEqual({ items: [4] });
	});

	it("returns the target unchanged when source is falsy", () => {
		const target = { a: 1 };
		expect(deepMerge(target, null)).toBe(target);
		expect(deepMerge(target, undefined)).toBe(target);
	});

	it("only overrides keys already present on the target when onlyExistingKeys is set", () => {
		const target: { a: number; b?: number } = { a: 1 };
		expect(deepMerge(target, { a: 2, b: 3 }, { onlyExistingKeys: true })).toEqual({ a: 2 });
	});

	// `typeof null === "object"` en JavaScript : sans garde explicite, une valeur `null` dans la
	// source serait traitée comme un objet à fusionner plutôt qu'une valeur à affecter telle quelle.
	it("assigns a null source value as-is instead of merging into it", () => {
		expect(deepMerge({} as { a?: unknown }, { a: null })).toEqual({ a: null });
		expect(deepMerge({ a: { x: 1 } }, { a: null })).toEqual({ a: null });
	});
});

describe("extractFields", () => {
	it("extracts only the requested keys", () => {
		const source = { a: 1, b: 2, c: 3 };
		expect(extractFields<{ a: number; c: number }>(["a", "c"], source)).toEqual({ a: 1, c: 3 });
	});

	it("uses an empty string for missing keys when the source is null or undefined", () => {
		expect(extractFields(["a", "b"], null)).toEqual({ a: "", b: "" });
		expect(extractFields(["a", "b"], undefined)).toEqual({ a: "", b: "" });
	});
});

describe("getKeysDeepJoined", () => {
	it("lists top-level keys", () => {
		expect(getKeysDeepJoined({ a: 1, b: 2 })).toEqual(["a", "b"]);
	});

	it("joins nested keys with the separator", () => {
		expect(getKeysDeepJoined({ a: { b: 1, c: 2 } })).toEqual(["a.b", "a.c"]);
	});

	it("supports a custom separator", () => {
		expect(getKeysDeepJoined({ a: { b: 1 } }, "/")).toEqual(["a/b"]);
	});

	it("treats null values as leaves rather than recursing into them", () => {
		expect(getKeysDeepJoined({ a: null })).toEqual(["a"]);
	});
});

describe("deepObjectsComparison", () => {
	it("returns true for deeply equal objects", () => {
		expect(deepObjectsComparison({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
	});

	it("returns false for different objects", () => {
		expect(deepObjectsComparison({ a: 1 }, { a: 2 })).toBe(false);
	});

	it("is sensitive to key order (JSON.stringify-based comparison)", () => {
		expect(deepObjectsComparison({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(false);
	});
});
