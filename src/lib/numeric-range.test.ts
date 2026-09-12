import { coerceToRange, NumericRange } from "./numeric-range";

const INT: NumericRange = { min: -32768, max: 32767, integer: true, wrap: true };
const WORD: NumericRange = { min: 0, max: 65535, integer: true, wrap: true };
const LONG: NumericRange = {
	min: -9007199254740991,
	max: 9007199254740991,
	integer: true,
	wrap: false,
};

describe("coerceToRange", () => {
	it("laisse une valeur dans les bornes inchangée", () => {
		expect(coerceToRange(1000, INT)).toBe(1000);
		expect(coerceToRange(-32768, INT)).toBe(-32768);
		expect(coerceToRange(32767, INT)).toBe(32767);
	});

	it("tronque vers zéro quand integer est vrai", () => {
		expect(coerceToRange(12.9, INT)).toBe(12);
		expect(coerceToRange(-12.9, INT)).toBe(-12);
	});

	it("replie un INT qui dépasse 32767 (comportement automate)", () => {
		expect(coerceToRange(32768, INT)).toBe(-32768);
		expect(coerceToRange(40000, INT)).toBe(40000 - 65536);
		expect(coerceToRange(-32769, INT)).toBe(32767);
	});

	it("replie un WORD modulo 65536", () => {
		expect(coerceToRange(65536, WORD)).toBe(0);
		expect(coerceToRange(-1, WORD)).toBe(65535);
		expect(coerceToRange(70000, WORD)).toBe(70000 - 65536);
	});

	it("sature au lieu de replier quand wrap est faux", () => {
		expect(coerceToRange(1e18, LONG)).toBe(LONG.max);
		expect(coerceToRange(-1e18, LONG)).toBe(LONG.min);
	});

	it("laisse passer NaN et Infinity sans les borner", () => {
		expect(coerceToRange(NaN, INT)).toBeNaN();
		expect(coerceToRange(Infinity, INT)).toBe(Infinity);
	});
});
