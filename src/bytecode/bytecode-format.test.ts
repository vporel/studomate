import {
	COUNTER_KIND_CTUD,
	SIGNED_ARITHMETIC_TYPES,
	TYPE_CODE,
	counterOperandBytes,
	counterPops,
} from "./bytecode-format";

describe("counter kinds", () => {
	it("numbers CTUD 2, as the specification and the C VM do", () => {
		expect(COUNTER_KIND_CTUD).toBe(2);
	});

	it("gives CTUD two more operands and two more pops than CTU and CTD", () => {
		expect(counterOperandBytes(COUNTER_KIND_CTUD)).toBe(6);
		expect(counterPops(COUNTER_KIND_CTUD)).toBe(5);
		for (const kind of [0, 1]) {
			expect(counterOperandBytes(kind)).toBe(4);
			expect(counterPops(kind)).toBe(3);
		}
	});
});

describe("SIGNED_ARITHMETIC_TYPES", () => {
	it("holds the signed types only", () => {
		expect(SIGNED_ARITHMETIC_TYPES).toEqual(
			expect.arrayContaining([
				TYPE_CODE.INT,
				TYPE_CODE.DINT,
				TYPE_CODE.TIME,
				TYPE_CODE.INTERNAL,
			]),
		);
		expect(SIGNED_ARITHMETIC_TYPES).toHaveLength(4);
		for (const code of [TYPE_CODE.BOOL, TYPE_CODE.WORD, TYPE_CODE.DWORD]) {
			expect(SIGNED_ARITHMETIC_TYPES).not.toContain(code);
		}
	});
});
