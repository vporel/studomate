import { isNumberLiteral, parseNumberLiteral } from "./number";

describe("isNumberLiteral", () => {
	it("reconnaît un entier ou un décimal, signe optionnel", () => {
		expect(isNumberLiteral("42")).toBe(true);
		expect(isNumberLiteral("-3")).toBe(true);
		expect(isNumberLiteral(" 1.5 ")).toBe(true);
	});

	it("rejette un identifiant, une notation partielle ou une constante TIME", () => {
		expect(isNumberLiteral("abc")).toBe(false);
		expect(isNumberLiteral("1.")).toBe(false);
		expect(isNumberLiteral("T#5s")).toBe(false);
	});
});

describe("parseNumberLiteral", () => {
	it("renvoie la valeur numérique d'un littéral valide", () => {
		expect(parseNumberLiteral("42")).toBe(42);
		expect(parseNumberLiteral("-1.5")).toBe(-1.5);
	});

	it("renvoie null pour un texte qui n'est pas un littéral numérique", () => {
		expect(parseNumberLiteral("abc")).toBeNull();
	});
});
