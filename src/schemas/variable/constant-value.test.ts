import { Dialect } from "@/expression-language/dialect.enum";
import {
	getDefaultConstantValue,
	parseConstantLiteral,
} from "./constant-value";
import { VARIABLE_TYPES } from "./variable.schema";

describe("getDefaultConstantValue", () => {
	it.each([
		["BOOL", Dialect.FR, "FAUX"],
		["BOOL", Dialect.EN, "FALSE"],
		["INT", Dialect.FR, "0"],
		["DINT", Dialect.FR, "0"],
		["WORD", Dialect.FR, "0"],
		["DWORD", Dialect.FR, "0"],
		["REAL", Dialect.FR, "0"],
		["STRING", Dialect.FR, '""'],
		["TIME", Dialect.FR, "T#0s"],
	] as const)("%s in %s → %s", (type, dialect, expected) => {
		expect(getDefaultConstantValue(type, dialect)).toBe(expected);
	});

	it("is always a valid literal for its own type", () => {
		for (const type of VARIABLE_TYPES) {
			for (const dialect of [Dialect.FR, Dialect.EN]) {
				expect(
					parseConstantLiteral(
						getDefaultConstantValue(type, dialect),
						type,
						dialect,
					),
				).not.toBeNull();
			}
		}
	});
});

describe("parseConstantLiteral", () => {
	it("parses the boolean keywords of the dialect only", () => {
		expect(parseConstantLiteral("VRAI", "BOOL", Dialect.FR)).toBe(true);
		expect(parseConstantLiteral("faux", "BOOL", Dialect.FR)).toBe(false);
		expect(parseConstantLiteral("TRUE", "BOOL", Dialect.EN)).toBe(true);
		expect(parseConstantLiteral("true", "BOOL", Dialect.FR)).toBeNull();
		expect(parseConstantLiteral("vrai", "BOOL", Dialect.EN)).toBeNull();
	});

	it("parses a TIME literal in milliseconds", () => {
		expect(parseConstantLiteral("T#5s", "TIME", Dialect.FR)).toBe(5000);
		expect(parseConstantLiteral("T#1m500ms", "TIME", Dialect.FR)).toBe(60500);
		expect(parseConstantLiteral("5", "TIME", Dialect.FR)).toBeNull();
		expect(parseConstantLiteral("T#s5s", "TIME", Dialect.FR)).toBeNull();
	});

	it("parses a STRING literal without its quotes", () => {
		expect(parseConstantLiteral('"abc"', "STRING", Dialect.FR)).toBe("abc");
		expect(parseConstantLiteral("'abc'", "STRING", Dialect.FR)).toBe("abc");
		expect(parseConstantLiteral('""', "STRING", Dialect.FR)).toBe("");
		expect(parseConstantLiteral("abc", "STRING", Dialect.FR)).toBeNull();
	});

	it("REAL accepts decimals", () => {
		expect(parseConstantLiteral("1.5", "REAL", Dialect.FR)).toBe(1.5);
		expect(parseConstantLiteral("-2", "REAL", Dialect.FR)).toBe(-2);
		expect(parseConstantLiteral("x", "REAL", Dialect.FR)).toBeNull();
	});

	it.each([
		["INT", "32767", 32767],
		["INT", "-32768", -32768],
		["WORD", "65535", 65535],
		["DINT", "-2147483648", -2147483648],
		["DWORD", "4294967295", 4294967295],
	] as const)("%s accepts the bound %s", (type, text, expected) => {
		expect(parseConstantLiteral(text, type, Dialect.FR)).toBe(expected);
	});

	it.each([
		["INT", "32768"],
		["INT", "-32769"],
		["WORD", "-1"],
		["WORD", "65536"],
		["DINT", "2147483648"],
		["DWORD", "4294967296"],
	] as const)("%s refuses %s: no coercion into the range", (type, text) => {
		expect(parseConstantLiteral(text, type, Dialect.FR)).toBeNull();
	});

	it("integer types refuse a decimal", () => {
		expect(parseConstantLiteral("1.5", "INT", Dialect.FR)).toBeNull();
		expect(parseConstantLiteral("2.0", "DWORD", Dialect.FR)).toBe(2);
	});
});
