import { isStringLiteral } from "./string";

describe("isStringLiteral", () => {
	it("reconnaît une chaîne entre guillemets doubles ou simples", () => {
		expect(isStringLiteral('"abc"')).toBe(true);
		expect(isStringLiteral("'abc'")).toBe(true);
		expect(isStringLiteral('""')).toBe(true);
		expect(isStringLiteral('  "x"  ')).toBe(true);
	});

	it("rejette une chaîne non fermée ou aux quotes dépareillées", () => {
		expect(isStringLiteral('"abc')).toBe(false);
		expect(isStringLiteral("\"abc'")).toBe(false);
	});

	it("rejette un identifiant ou un nombre", () => {
		expect(isStringLiteral("abc")).toBe(false);
		expect(isStringLiteral("42")).toBe(false);
	});
});
