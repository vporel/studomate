import InvalidCharacterException from "./exceptions/invalid-character.exception";
import UnterminatedStringException from "./exceptions/unterminated-string.exception";
import { Language } from "./language.enum";
import { Lexer } from "./lexer";
import { TokenType } from "./tokens/tokens";

describe("Lexer", () => {
	let lexer: Lexer;

	beforeEach(() => {
		lexer = new Lexer(Language.FR);
	});

	describe("whitespace", () => {
		it("ignores whitespace characters", () => {
			const tokens = lexer.tokenize("   42   ");
			expect(tokens.length).toBe(2); // NUMBER + EOF
			expect(tokens[0].type).toBe(TokenType.NUMBER);
		});
	});

	describe("numbers", () => {
		it("tokenizes integers", () => {
			const tokens = lexer.tokenize("42");
			expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: "42" });
		});

		it("tokenizes decimals", () => {
			const tokens = lexer.tokenize("3.14");
			expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: "3.14" });
		});

		it("throws on invalid decimal format", () => {
			expect(() => lexer.tokenize("3.")).toThrow(InvalidCharacterException);
		});
	});

	describe("durations", () => {
		it("tokenizes durations with ms unit", () => {
			const tokens = lexer.tokenize("100ms");
			expect(tokens[0]).toMatchObject({ type: TokenType.DURATION, value: "100ms" });
		});

		it("tokenizes durations with s, m, h, d units", () => {
			expect(lexer.tokenize("5s")[0].value).toBe("5s");
			expect(lexer.tokenize("10m")[0].value).toBe("10m");
			expect(lexer.tokenize("2h")[0].value).toBe("2h");
			expect(lexer.tokenize("7d")[0].value).toBe("7d");
		});

		it("tokenizes decimal durations", () => {
			const tokens = lexer.tokenize("2.5s");
			expect(tokens[0]).toMatchObject({ type: TokenType.DURATION, value: "2.5s" });
		});
	});

	describe("strings", () => {
		it("tokenizes double-quoted strings", () => {
			const tokens = lexer.tokenize('"hello"');
			expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: "hello" });
		});

		it("tokenizes single-quoted strings", () => {
			const tokens = lexer.tokenize("'world'");
			expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: "world" });
		});

		it("throws on unterminated string", () => {
			expect(() => lexer.tokenize('"unterminated')).toThrow(UnterminatedStringException);
		});
	});

	describe("identifiers", () => {
		it("tokenizes identifiers", () => {
			const tokens = lexer.tokenize("my_var123");
			expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: "my_var123" });
		});

		it("tokenizes identifiers starting with underscore", () => {
			const tokens = lexer.tokenize("_private");
			expect(tokens[0]).toMatchObject({ type: TokenType.IDENTIFIER, value: "_private" });
		});
	});

	describe("keywords", () => {
		it("tokenizes French boolean keywords", () => {
			const lexerFR = new Lexer(Language.FR);
			expect(lexerFR.tokenize("VRAI")[0].type).toBe(TokenType.TRUE);
			expect(lexerFR.tokenize("vrai")[0].type).toBe(TokenType.TRUE);
			expect(lexerFR.tokenize("FAUX")[0].type).toBe(TokenType.FALSE);
		});

		it("tokenizes French logical operators", () => {
			const lexerFR = new Lexer(Language.FR);
			expect(lexerFR.tokenize("ET")[0].type).toBe(TokenType.AND);
			expect(lexerFR.tokenize("OU")[0].type).toBe(TokenType.OR);
			expect(lexerFR.tokenize("NON")[0].type).toBe(TokenType.NOT);
		});

		it("tokenizes English boolean keywords", () => {
			const lexerEN = new Lexer(Language.EN);
			expect(lexerEN.tokenize("TRUE")[0].type).toBe(TokenType.TRUE);
			expect(lexerEN.tokenize("true")[0].type).toBe(TokenType.TRUE);
			expect(lexerEN.tokenize("FALSE")[0].type).toBe(TokenType.FALSE);
		});

		it("tokenizes English logical operators", () => {
			const lexerEN = new Lexer(Language.EN);
			expect(lexerEN.tokenize("AND")[0].type).toBe(TokenType.AND);
			expect(lexerEN.tokenize("OR")[0].type).toBe(TokenType.OR);
			expect(lexerEN.tokenize("NOT")[0].type).toBe(TokenType.NOT);
		});
	});

	describe("operators", () => {
		it("tokenizes arithmetic operators", () => {
			const tokens = lexer.tokenize("+ - * /");
			expect(tokens[0].type).toBe(TokenType.PLUS);
			expect(tokens[1].type).toBe(TokenType.MINUS);
			expect(tokens[2].type).toBe(TokenType.MUL);
			expect(tokens[3].type).toBe(TokenType.SLASH);
		});

		it("tokenizes comparison operators", () => {
			const tokens = lexer.tokenize("= != < > <= >=");
			expect(tokens[0].type).toBe(TokenType.EQ);
			expect(tokens[1].type).toBe(TokenType.NEQ);
			expect(tokens[2].type).toBe(TokenType.LT);
			expect(tokens[3].type).toBe(TokenType.GT);
			expect(tokens[4].type).toBe(TokenType.LTE);
			expect(tokens[5].type).toBe(TokenType.GTE);
		});

		it("tokenizes assignment operator", () => {
			const tokens = lexer.tokenize(":=");
			expect(tokens[0].type).toBe(TokenType.ASSIGN);
		});
	});

	describe("parentheses", () => {
		it("tokenizes parentheses", () => {
			const tokens = lexer.tokenize("()");
			expect(tokens[0].type).toBe(TokenType.LPAREN);
			expect(tokens[1].type).toBe(TokenType.RPAREN);
		});
	});

	describe("complex expressions", () => {
		it("tokenizes arithmetic expression", () => {
			const tokens = lexer.tokenize("x := 5 + 3 * 2");
			expect(tokens.map((t) => t.type)).toEqual([
				TokenType.IDENTIFIER,
				TokenType.ASSIGN,
				TokenType.NUMBER,
				TokenType.PLUS,
				TokenType.NUMBER,
				TokenType.MUL,
				TokenType.NUMBER,
				TokenType.EOF,
			]);
		});

		it("tokenizes boolean expression", () => {
			const tokens = lexer.tokenize("VRAI ET FAUX OU NON x");
			expect(tokens.map((t) => t.type)).toEqual([
				TokenType.TRUE,
				TokenType.AND,
				TokenType.FALSE,
				TokenType.OR,
				TokenType.NOT,
				TokenType.IDENTIFIER,
				TokenType.EOF,
			]);
		});

		it("tokenizes comparison expression", () => {
			const tokens = lexer.tokenize("temp >= 20.5");
			expect(tokens.map((t) => t.type)).toEqual([
				TokenType.IDENTIFIER,
				TokenType.GTE,
				TokenType.NUMBER,
				TokenType.EOF,
			]);
		});
	});

	describe("EOF token", () => {
		it("always adds EOF token at end", () => {
			const tokens = lexer.tokenize("x");
			expect(tokens[tokens.length - 1].type).toBe(TokenType.EOF);
		});
	});

	describe("error handling", () => {
		it("throws on invalid character", () => {
			expect(() => lexer.tokenize("@invalid")).toThrow(InvalidCharacterException);
		});
	});

	describe("position tracking", () => {
		it("tracks position of tokens", () => {
			const tokens = lexer.tokenize("abc 123");
			expect(tokens[0].position).toBe(0); // 'abc' starts at position 0
			expect(tokens[1].position).toBe(4); // '123' starts at position 4 (after space)
		});
	});
});
