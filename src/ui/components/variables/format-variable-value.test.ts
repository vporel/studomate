import { Dialect } from "@/expression-language/dialect.enum";
import Variable from "@/schemas/variable/variable.schema";
import {
	formatBooleanValue,
	formatTimeValue,
	formatVariableValue,
} from "./format-variable-value";

describe("formatBooleanValue", () => {
	it("retourne VRAI/FAUX en dialecte FR", () => {
		expect(formatBooleanValue(true, Dialect.FR)).toBe("VRAI");
		expect(formatBooleanValue(false, Dialect.FR)).toBe("FAUX");
	});

	it("retourne TRUE/FALSE en dialecte EN", () => {
		expect(formatBooleanValue(true, Dialect.EN)).toBe("TRUE");
		expect(formatBooleanValue(false, Dialect.EN)).toBe("FALSE");
	});

	it("retourne '-' quand la valeur est inconnue", () => {
		expect(formatBooleanValue(undefined, Dialect.FR)).toBe("-");
	});
});

describe("formatTimeValue", () => {
	it.each([
		[200, "0.2s"],
		[5000, "5s"],
		[1500, "1.5s"],
		[59000, "59s"],
		[60000, "1m"],
		[90000, "1.5m"],
		[3600000, "1h"],
		[5400000, "1.5h"],
		[86400000, "1d"],
		[172800000, "2d"],
	])("formate %ims en %s", (ms, expected) => {
		expect(formatTimeValue(ms)).toBe(expected);
	});
});

describe("formatVariableValue", () => {
	it("retourne undefined quand la valeur n'est pas connue", () => {
		const v = new Variable("v1", "A", "memory", "INT");
		expect(formatVariableValue(v, undefined, Dialect.FR)).toBeUndefined();
	});

	it("formate un BOOL", () => {
		const v = new Variable("v1", "A", "memory", "BOOL");
		expect(formatVariableValue(v, true, Dialect.FR)).toBe("VRAI");
	});

	it("formate un TIME", () => {
		const v = new Variable("v1", "A", "memory", "TIME");
		expect(formatVariableValue(v, 5000, Dialect.FR)).toBe("5s");
	});

	it("formate un INT tel quel", () => {
		const v = new Variable("v1", "A", "memory", "INT");
		expect(formatVariableValue(v, 42, Dialect.FR)).toBe("42");
	});

	it("formate un STRING tel quel", () => {
		const v = new Variable("v1", "A", "memory", "STRING");
		expect(formatVariableValue(v, "hello", Dialect.FR)).toBe("hello");
	});
});
