import { isBooleanLiteral, parseBooleanLiteral } from "./boolean";
import { Dialect } from "../dialect.enum";

describe("isBooleanLiteral", () => {
	it("reconnaît vrai/faux en dialecte FR, insensible à la casse", () => {
		expect(isBooleanLiteral("vrai", Dialect.FR)).toBe(true);
		expect(isBooleanLiteral("FAUX", Dialect.FR)).toBe(true);
		expect(isBooleanLiteral("  Vrai  ", Dialect.FR)).toBe(true);
	});

	it("reconnaît true/false en dialecte EN", () => {
		expect(isBooleanLiteral("true", Dialect.EN)).toBe(true);
		expect(isBooleanLiteral("False", Dialect.EN)).toBe(true);
	});

	it("ne reconnaît pas le mot-clé de l'autre dialecte", () => {
		expect(isBooleanLiteral("vrai", Dialect.EN)).toBe(false);
		expect(isBooleanLiteral("true", Dialect.FR)).toBe(false);
	});

	it("rejette un identifiant ordinaire", () => {
		expect(isBooleanLiteral("moteur", Dialect.FR)).toBe(false);
	});
});

describe("parseBooleanLiteral", () => {
	it("renvoie la valeur du littéral en dialecte FR, insensible à la casse et aux espaces", () => {
		expect(parseBooleanLiteral("vrai", Dialect.FR)).toBe(true);
		expect(parseBooleanLiteral("  FAUX ", Dialect.FR)).toBe(false);
	});

	it("renvoie la valeur du littéral en dialecte EN", () => {
		expect(parseBooleanLiteral("TRUE", Dialect.EN)).toBe(true);
		expect(parseBooleanLiteral("false", Dialect.EN)).toBe(false);
	});

	it("renvoie null pour un identifiant ou le mot-clé de l'autre dialecte", () => {
		expect(parseBooleanLiteral("moteur", Dialect.FR)).toBeNull();
		expect(parseBooleanLiteral("true", Dialect.FR)).toBeNull();
		expect(parseBooleanLiteral("vrai", Dialect.EN)).toBeNull();
		expect(parseBooleanLiteral("", Dialect.FR)).toBeNull();
	});
});
