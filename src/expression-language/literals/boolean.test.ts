import { isBooleanLiteral } from "./boolean";
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
