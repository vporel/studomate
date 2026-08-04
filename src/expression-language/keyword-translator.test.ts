import { Dialect } from "./dialect.enum";
import KeywordTranslator from "./keyword-translator";

const frToEn = (e: string) => KeywordTranslator.translate(e, Dialect.FR, Dialect.EN);
const enToFr = (e: string) => KeywordTranslator.translate(e, Dialect.EN, Dialect.FR);

describe("KeywordTranslator", () => {
	describe("traduction des mots-clés", () => {
		it("traduit les opérateurs logiques", () => {
			expect(frToEn("a ET b OU NON c")).toBe("a AND b OR NOT c");
			expect(enToFr("a AND b OR NOT c")).toBe("a ET b OU NON c");
		});

		it("traduit les littéraux booléens", () => {
			expect(frToEn("VRAI ET FAUX")).toBe("TRUE AND FALSE");
			expect(enToFr("TRUE AND FALSE")).toBe("VRAI ET FAUX");
		});

		it("préserve la mise en forme", () => {
			expect(frToEn("  a   ET  b ")).toBe("  a   AND  b ");
		});

		it("ne touche pas aux identifiants", () => {
			expect(frToEn("Btn1 ET Btn2")).toBe("Btn1 AND Btn2");
		});

		it("laisse l'expression intacte si les dialectes sont identiques", () => {
			expect(KeywordTranslator.translate("a ET b", Dialect.FR, Dialect.FR)).toBe("a ET b");
		});

		it("laisse intacte une expression sans mot-clé", () => {
			expect(frToEn("a + b * 2")).toBe("a + b * 2");
		});
	});

	describe("ce qui ne doit pas être traduit", () => {
		it("ignore le contenu des chaînes", () => {
			expect(frToEn('msg := "moteur ET pompe"')).toBe('msg := "moteur ET pompe"');
		});

		it("ignore un identifiant dont le mot-clé est un préfixe", () => {
			expect(frToEn("ETAT ET a")).toBe("ETAT AND a");
		});

		// Un renommage silencieux serait pire : l'analyse signalera le conflit
		it("ne renomme pas un identifiant qui devient mot-clé dans le dialecte cible", () => {
			expect(frToEn("AND ET b")).toBe("AND AND b");
		});

		it("ne prend pas l'unité d'une durée pour un mot", () => {
			expect(frToEn("t1/X10/5s ET a")).toBe("t1/X10/5s AND a");
		});
	});

	describe("expressions en cours d'édition", () => {
		it("traduit malgré un caractère hors alphabet", () => {
			expect(frToEn("a ET b, c")).toBe("a AND b, c");
		});

		it("traduit malgré une expression incomplète", () => {
			expect(frToEn("a ET ")).toBe("a AND ");
		});

		it("protège le contenu d'une chaîne non terminée", () => {
			expect(frToEn('a ET "b ET c')).toBe('a AND "b ET c');
		});

		it("gère une expression vide", () => {
			expect(frToEn("")).toBe("");
		});
	});

	it("est réversible", () => {
		const original = "Btn1 ET NON Btn2 OU VRAI";
		expect(enToFr(frToEn(original))).toBe(original);
	});
});
