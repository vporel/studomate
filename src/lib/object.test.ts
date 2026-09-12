import { deepObjectsComparison, extractFields, invertRecord } from "./object";

describe("invertRecord", () => {
	it("swaps keys and values", () => {
		const record = { a: "1", b: "2", c: "3" };
		expect(invertRecord(record)).toEqual({ "1": "a", "2": "b", "3": "c" });
	});

	it("handles an empty record", () => {
		expect(invertRecord({})).toEqual({});
	});
});

describe("extractFields", () => {
	it("extracts only the requested keys", () => {
		const source = { a: 1, b: 2, c: 3 };
		expect(extractFields<{ a: number; c: number }>(["a", "c"], source)).toEqual(
			{ a: 1, c: 3 },
		);
	});

	it("uses an empty string for missing keys when the source is null or undefined", () => {
		expect(extractFields(["a", "b"], null)).toEqual({ a: "", b: "" });
		expect(extractFields(["a", "b"], undefined)).toEqual({ a: "", b: "" });
	});
});

describe("deepObjectsComparison", () => {
	it("returns true for deeply equal objects", () => {
		expect(
			deepObjectsComparison({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }),
		).toBe(true);
	});

	it("returns false for different objects", () => {
		expect(deepObjectsComparison({ a: 1 }, { a: 2 })).toBe(false);
	});

	it("is insensitive to key order", () => {
		expect(deepObjectsComparison({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
	});

	it("treats NaN as equal to itself", () => {
		expect(deepObjectsComparison({ a: NaN }, { a: NaN })).toBe(true);
		expect(deepObjectsComparison({ a: NaN }, { a: 1 })).toBe(false);
	});

	it("compares arrays element by element, order-sensitively", () => {
		expect(deepObjectsComparison([1, 2, 3], [1, 2, 3])).toBe(true);
		expect(deepObjectsComparison([1, 2, 3], [3, 2, 1])).toBe(false);
		expect(deepObjectsComparison([1, 2], [1, 2, 3])).toBe(false);
	});

	it("does not consider an array equal to an object with the same entries", () => {
		expect(deepObjectsComparison([1, 2], { 0: 1, 1: 2 })).toBe(false);
	});

	it("treats an explicit undefined value as different from a missing key", () => {
		expect(deepObjectsComparison({ a: undefined }, {})).toBe(false);
	});

	it("compares deeply nested structures", () => {
		const a = {
			steps: { s1: { data: { branches: { b1: { position: 1 } } } } },
		};
		const b = {
			steps: { s1: { data: { branches: { b1: { position: 1 } } } } },
		};
		const c = {
			steps: { s1: { data: { branches: { b1: { position: 2 } } } } },
		};
		expect(deepObjectsComparison(a, b)).toBe(true);
		expect(deepObjectsComparison(a, c)).toBe(false);
	});

	it("returns true for the same reference without traversing it", () => {
		const shared = { a: 1 };
		expect(deepObjectsComparison(shared, shared)).toBe(true);
	});

	it("returns false when only one side is null", () => {
		expect(deepObjectsComparison(null, { a: 1 })).toBe(false);
		expect(deepObjectsComparison({ a: 1 }, null)).toBe(false);
	});

	it("returns true for two nulls", () => {
		expect(deepObjectsComparison(null, null)).toBe(true);
	});
});
