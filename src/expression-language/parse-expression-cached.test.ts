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

	it("ignore les espaces de bord dans la clé", () => {
		const a = parseExpressionCached("a ET b", Dialect.FR);
		const b = parseExpressionCached("   a ET b  ", Dialect.FR);

		expect(b).toBe(a);
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
