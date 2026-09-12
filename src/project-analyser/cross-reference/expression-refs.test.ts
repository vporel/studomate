import { Dialect } from "@/expression-language/dialect.enum";
import { expressionRefs, identifierName } from "./expression-refs";

describe("identifierName", () => {
	it("renvoie le mnémonique d'une expression réduite à un identifiant", () => {
		expect(identifierName("Capteur1", Dialect.FR)).toBe("Capteur1");
	});

	it("renvoie null pour un littéral, une expression composée ou une saisie vide", () => {
		expect(identifierName("T#5s", Dialect.FR)).toBeNull();
		expect(identifierName("12", Dialect.FR)).toBeNull();
		expect(identifierName("a ET b", Dialect.FR)).toBeNull();
		expect(identifierName("", Dialect.FR)).toBeNull();
	});

	it("ne lève pas sur une expression invalide", () => {
		expect(identifierName("@@@", Dialect.FR)).toBeNull();
	});
});

describe("expressionRefs", () => {
	it("liste les identifiants lus d'une réceptivité booléenne", () => {
		const { reads, writes } = expressionRefs("Dcy ET NON Arret", Dialect.FR);
		expect(new Set(reads)).toEqual(new Set(["Dcy", "Arret"]));
		expect(writes).toEqual([]);
	});

	it("sépare la cible (écriture) des membres droits (lecture) d'une affectation", () => {
		const { reads, writes } = expressionRefs("Sortie := In1 + In2", Dialect.FR);
		expect(writes).toEqual(["Sortie"]);
		expect(new Set(reads)).toEqual(new Set(["In1", "In2"]));
	});

	it("compte une cible qui se relit elle-même à la fois en lecture et en écriture", () => {
		const { reads, writes } = expressionRefs("Cnt := Cnt + 1", Dialect.FR);
		expect(writes).toEqual(["Cnt"]);
		expect(reads).toEqual(["Cnt"]);
	});

	it("traite le nom d'un timer déclaré en écriture et son entrée en lecture", () => {
		const { reads, writes } = expressionRefs("t1/X1/5s", Dialect.FR);
		expect(writes).toEqual(["t1"]);
		expect(reads).toEqual(["X1"]);
	});

	it("dédoublonne les identifiants répétés", () => {
		const { reads } = expressionRefs("a ET a ET b", Dialect.FR);
		expect(new Set(reads)).toEqual(new Set(["a", "b"]));
	});

	it("ne lève pas et ne produit rien sur une expression invalide", () => {
		expect(expressionRefs("a ET ET", Dialect.FR)).toEqual({ reads: [], writes: [] });
	});
});
