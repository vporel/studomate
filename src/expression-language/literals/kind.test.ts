import { Dialect } from "../dialect.enum";
import {
	matchesAnyAcceptedLiteral,
	matchesLiteralKind,
} from "./kind";

describe("matchesLiteralKind", () => {
	it("distingue les quatre genres de littéral", () => {
		expect(matchesLiteralKind("T#5s", "time", Dialect.FR)).toBe(true);
		expect(matchesLiteralKind("42", "number", Dialect.FR)).toBe(true);
		expect(matchesLiteralKind("vrai", "boolean", Dialect.FR)).toBe(true);
		expect(matchesLiteralKind('"x"', "string", Dialect.FR)).toBe(true);
	});

	it("un nombre n'est pas une constante TIME et inversement", () => {
		expect(matchesLiteralKind("42", "time", Dialect.FR)).toBe(false);
		expect(matchesLiteralKind("T#5s", "number", Dialect.FR)).toBe(false);
	});

	it("exige une constante TIME bien formée, pas seulement le préfixe T#", () => {
		expect(matchesLiteralKind("T#s5s", "time", Dialect.FR)).toBe(false);
		expect(matchesLiteralKind("T#", "time", Dialect.FR)).toBe(false);
		expect(matchesLiteralKind("T#1h2m3s", "time", Dialect.FR)).toBe(true);
	});
});

describe("matchesAnyAcceptedLiteral", () => {
	it("vrai si le texte correspond à l'un des genres acceptés", () => {
		expect(
			matchesAnyAcceptedLiteral("42", ["boolean", "number"], Dialect.FR),
		).toBe(true);
	});

	it("faux si la liste est absente ou vide", () => {
		expect(matchesAnyAcceptedLiteral("42", undefined, Dialect.FR)).toBe(false);
		expect(matchesAnyAcceptedLiteral("42", [], Dialect.FR)).toBe(false);
	});

	it("faux si le texte ne correspond à aucun genre accepté", () => {
		expect(matchesAnyAcceptedLiteral("moteur", ["number"], Dialect.FR)).toBe(
			false,
		);
	});
});
