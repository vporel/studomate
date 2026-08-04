import { Dialect } from "@/expression-language/dialect.enum";
import IdentifierRenamer from "./identifier-renamer";

describe("IdentifierRenamer", () => {
	describe("rename", () => {
		it("renames a simple identifier", () => {
			expect(IdentifierRenamer.rename("moteur", { moteur: "pompe" })).toBe("pompe");
		});

		it("renames every occurrence in an expression", () => {
			expect(IdentifierRenamer.rename("moteur ET NON moteur", { moteur: "pompe" })).toBe(
				"pompe ET NON pompe",
			);
		});

		it("preserves whitespace and formatting", () => {
			expect(IdentifierRenamer.rename("  moteur   ET  capteur ", { moteur: "pompe" })).toBe(
				"  pompe   ET  capteur ",
			);
		});

		// Régression : l'ancienne implémentation par split/join corrompait ces cas
		describe("ne touche pas ce qui ressemble à l'identifiant", () => {
			it("laisse intact un identifiant dont l'ancien nom est un préfixe", () => {
				expect(IdentifierRenamer.rename("moteur_1", { moteur: "pompe" })).toBe("moteur_1");
			});

			it("laisse intact un identifiant dont l'ancien nom est un suffixe", () => {
				expect(IdentifierRenamer.rename("gros_moteur", { moteur: "pompe" })).toBe("gros_moteur");
			});

			it("distingue l'identifiant exact de ses variantes dans une même expression", () => {
				expect(
					IdentifierRenamer.rename("moteur ET moteur_1 OU gros_moteur", { moteur: "pompe" }),
				).toBe("pompe ET moteur_1 OU gros_moteur");
			});

			it("ne touche pas le contenu des chaînes de caractères", () => {
				expect(IdentifierRenamer.rename('etat := "moteur en marche"', { moteur: "pompe" })).toBe(
					'etat := "moteur en marche"',
				);
			});

			it("ne touche pas un mot-clé du langage", () => {
				// "ET" est un mot-clé en FR : il ne doit jamais être renommé
				expect(IdentifierRenamer.rename("a ET b", { ET: "X" })).toBe("a ET b");
			});
		});

		describe("renommages simultanés", () => {
			it("applique plusieurs renommages en une seule passe", () => {
				expect(IdentifierRenamer.rename("a ET b", { a: "x", b: "y" })).toBe("x ET y");
			});

			it("n'enchaîne pas les renommages (a→b et b→c ne donne pas a→c)", () => {
				expect(IdentifierRenamer.rename("a ET b", { a: "b", b: "c" })).toBe("b ET c");
			});

			it("gère un échange de noms", () => {
				expect(IdentifierRenamer.rename("a ET b", { a: "b", b: "a" })).toBe("b ET a");
			});
		});

		describe("cas limites", () => {
			it("retourne l'expression inchangée si aucun identifiant ne correspond", () => {
				expect(IdentifierRenamer.rename("a ET b", { z: "x" })).toBe("a ET b");
			});

			it("retourne l'expression inchangée si la table de renommage est vide", () => {
				expect(IdentifierRenamer.rename("a ET b", {})).toBe("a ET b");
			});

			it("gère une expression vide", () => {
				expect(IdentifierRenamer.rename("", { a: "b" })).toBe("");
			});

			it("respecte l'unité d'une durée", () => {
				// Le `s` de `5s` ne doit pas être vu comme un identifiant
				expect(IdentifierRenamer.rename("t1/X10/5s", { s: "SECONDE" })).toBe("t1/X10/5s");
			});
		});

		// Les expressions ne sont lexées qu'à l'analyse ou à la simulation : pendant
		// l'édition elles sont des chaînes libres, souvent momentanément invalides.
		// Le renommage doit s'y appliquer quand même, sinon un mnémonique périmé
		// subsiste et n'est découvert qu'à l'analyse suivante.
		describe("expressions en cours d'édition (non lexables)", () => {
			it("renomme malgré un caractère hors alphabet du lexer", () => {
				expect(IdentifierRenamer.rename("moteur, capteur", { moteur: "pompe" })).toBe(
					"pompe, capteur",
				);
			});

			it("renomme malgré un caractère accentué", () => {
				expect(IdentifierRenamer.rename("moteur ET arrêt", { moteur: "pompe" })).toBe(
					"pompe ET arrêt",
				);
			});

			it("renomme malgré une expression incomplète", () => {
				expect(IdentifierRenamer.rename("moteur ET ", { moteur: "pompe" })).toBe("pompe ET ");
			});

			it("protège quand même le contenu d'une chaîne non terminée", () => {
				expect(IdentifierRenamer.rename('moteur ET "moteur', { moteur: "pompe" })).toBe(
					'pompe ET "moteur',
				);
			});

			it("respecte la langue pour distinguer mots-clés et identifiants", () => {
				// "AND" est un identifiant en FR, mais un mot-clé en EN
				expect(IdentifierRenamer.rename("AND", { AND: "X" }, Dialect.FR)).toBe("X");
				expect(IdentifierRenamer.rename("AND", { AND: "X" }, Dialect.EN)).toBe("AND");
			});
		});
	});

	describe("usesAnyIdentifier", () => {
		it("détecte un identifiant utilisé", () => {
			expect(IdentifierRenamer.usesAnyIdentifier("moteur ET capteur", ["moteur"])).toBe(true);
		});

		it("ne confond pas avec un identifiant plus long", () => {
			expect(IdentifierRenamer.usesAnyIdentifier("moteur_1", ["moteur"])).toBe(false);
		});

		it("ignore le contenu des chaînes", () => {
			expect(IdentifierRenamer.usesAnyIdentifier('a := "moteur"', ["moteur"])).toBe(false);
		});

		it("retourne false sur une expression vide ou sans correspondance", () => {
			expect(IdentifierRenamer.usesAnyIdentifier("", ["moteur"])).toBe(false);
			expect(IdentifierRenamer.usesAnyIdentifier("a ET b", ["moteur"])).toBe(false);
		});

		it("détecte l'identifiant même dans une expression non lexable", () => {
			expect(IdentifierRenamer.usesAnyIdentifier("a, b", ["a"])).toBe(true);
		});
	});
});
