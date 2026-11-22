import { Dialect } from "./dialect.enum";
import {
	clearParseExpressionCache,
	parseExpressionCached,
} from "./parse-expression-cached";

beforeEach(() => clearParseExpressionCache());

describe("parseExpressionCached", () => {
	it("renvoie la même instance pour la même paire (expression, dialecte)", () => {
		const a = parseExpressionCached("a ET b", Dialect.FR);
		const b = parseExpressionCached("a ET b", Dialect.FR);

		expect(b).toBe(a);
		expect(b.ast).toBe(a.ast);
		expect(b.tokens).toBe(a.tokens);
	});

	it("ne partage pas l'entrée de deux expressions qui ne diffèrent que par leurs espaces de bord", () => {
		const a = parseExpressionCached("a ET b", Dialect.FR);
		const b = parseExpressionCached("   a ET b  ", Dialect.FR);

		expect(b).not.toBe(a);
	});

	it("garde des positions de tokens relatives au texte de chaque appelant, quelle que soit l'indentation du premier", () => {
		const indented = parseExpressionCached("  a AND b", Dialect.EN);
		const plain = parseExpressionCached("a AND b", Dialect.EN);

		expect(indented.tokens.map((t) => t.position)).toEqual([2, 4, 8, 9]);
		expect(plain.tokens.map((t) => t.position)).toEqual([0, 2, 6, 7]);
	});

	it("rend les positions de l'appelant même quand l'ordre des appels est inversé", () => {
		const plain = parseExpressionCached("a AND b", Dialect.EN);
		const indented = parseExpressionCached("  a AND b", Dialect.EN);

		expect(plain.tokens.map((t) => t.position)).toEqual([0, 2, 6, 7]);
		expect(indented.tokens.map((t) => t.position)).toEqual([2, 4, 8, 9]);
	});

	it("rapporte la position d'une erreur relative au texte de l'appelant, sans la mettre en cache", () => {
		parseExpressionCached("a AND b", Dialect.EN);

		expect(() => parseExpressionCached("  a $ b", Dialect.EN)).toThrow(
			/position 4/,
		);
		expect(() => parseExpressionCached("  a $ b", Dialect.EN)).toThrow(
			/position 4/,
		);
	});

	it("ne partage pas l'entrée de deux expressions qui ne diffèrent que par leurs espaces internes", () => {
		const a = parseExpressionCached("a ET b", Dialect.FR);
		const b = parseExpressionCached("a  ET  b", Dialect.FR);

		expect(b).not.toBe(a);
	});

	it("sépare les entrées par dialecte", () => {
		const fr = parseExpressionCached("a ET b", Dialect.FR);
		const en = parseExpressionCached("a AND b", Dialect.EN);

		expect(en).not.toBe(fr);
		expect(en.ast).not.toBe(fr.ast);
	});

	it("produit un AST équivalent à un lex+parse direct", async () => {
		const { Lexer } = await import("./lexer/lexer");
		const { default: Parser } = await import("./parser/parser");

		const direct = new Parser(
			new Lexer(Dialect.FR).tokenize("a ET (b OU NON c)"),
		).parse();
		const cached = parseExpressionCached("a ET (b OU NON c)", Dialect.FR).ast;

		// les `id` de nœuds diffèrent (générés aléatoirement) : on compare la structure
		const strip = (n: unknown): unknown =>
			JSON.parse(JSON.stringify(n, (k, v) => (k === "id" ? undefined : v)));
		expect(strip(cached)).toEqual(strip(direct));
	});

	it("gèle l'AST rendu hors production — toute mutation lève", () => {
		const { ast } = parseExpressionCached("a ET b", Dialect.FR);

		expect(Object.isFrozen(ast)).toBe(true);
		expect(() => {
			(ast as unknown as { type: string }).type = "HACKED";
		}).toThrow(TypeError);
	});

	it("évince en FIFO au-delà de la borne", () => {
		const first = parseExpressionCached("v0", Dialect.FR);
		for (let i = 1; i < 500; i++) parseExpressionCached(`v${i}`, Dialect.FR);
		// 500 entrées : la 501e évince la plus ancienne (`v0`)
		parseExpressionCached("v500", Dialect.FR);

		expect(parseExpressionCached("v0", Dialect.FR)).not.toBe(first);
		// une entrée insérée après `v0` est toujours là
		const v250 = parseExpressionCached("v250", Dialect.FR);
		expect(parseExpressionCached("v250", Dialect.FR)).toBe(v250);
	});
});
