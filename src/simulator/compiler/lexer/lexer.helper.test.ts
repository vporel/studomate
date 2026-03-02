import { Keyword } from "./keyword.enum";
import { Language } from "./language.enum";
import LexerHelper from "./lexer.helper";
import { TokenType } from "./tokens/tokens";

describe("LexerHelper", () => {
	describe("isLetterOrUnderscore", () => {
		it("returns true for letters", () => {
			expect(LexerHelper.isLetterOrUnderscore("a")).toBe(true);
			expect(LexerHelper.isLetterOrUnderscore("Z")).toBe(true);
		});

		it("returns true for underscore", () => {
			expect(LexerHelper.isLetterOrUnderscore("_")).toBe(true);
		});

		it("returns false for digits", () => {
			expect(LexerHelper.isLetterOrUnderscore("5")).toBe(false);
		});

		it("returns false for special characters", () => {
			expect(LexerHelper.isLetterOrUnderscore("@")).toBe(false);
		});
	});

	describe("isLetterOrUnderscoreOrDigit", () => {
		it("returns true for letters, underscore, and digits", () => {
			expect(LexerHelper.isLetterOrUnderscoreOrDigit("a")).toBe(true);
			expect(LexerHelper.isLetterOrUnderscoreOrDigit("_")).toBe(true);
			expect(LexerHelper.isLetterOrUnderscoreOrDigit("5")).toBe(true);
		});

		it("returns false for special characters", () => {
			expect(LexerHelper.isLetterOrUnderscoreOrDigit("@")).toBe(false);
		});
	});

	describe("isDigit", () => {
		it("returns true for digits", () => {
			expect(LexerHelper.isDigit("0")).toBe(true);
			expect(LexerHelper.isDigit("9")).toBe(true);
		});

		it("returns false for non-digits", () => {
			expect(LexerHelper.isDigit("a")).toBe(false);
			expect(LexerHelper.isDigit("_")).toBe(false);
		});
	});

	describe("isQuote", () => {
		it("returns true for single and double quotes", () => {
			expect(LexerHelper.isQuote('"')).toBe(true);
			expect(LexerHelper.isQuote("'")).toBe(true);
		});

		it("returns false for non-quote characters", () => {
			expect(LexerHelper.isQuote("a")).toBe(false);
			expect(LexerHelper.isQuote("`")).toBe(false);
		});
	});

	describe("getKeywordsStringsForLanguage", () => {
		it("returns French keywords for FR language", () => {
			const keywords = LexerHelper.getKeywordsStringsForLanguage(Language.FR);
			expect(keywords).toContain("VRAI");
			expect(keywords).toContain("FAUX");
			expect(keywords).toContain("ET");
			expect(keywords).toContain("OU");
			expect(keywords).toContain("NON");
		});

		it("returns English keywords for EN language", () => {
			const keywords = LexerHelper.getKeywordsStringsForLanguage(Language.EN);
			expect(keywords).toContain("TRUE");
			expect(keywords).toContain("FALSE");
			expect(keywords).toContain("AND");
			expect(keywords).toContain("OR");
			expect(keywords).toContain("NOT");
		});
	});

	describe("getKeywordByString", () => {
		it("returns correct keyword for French strings", () => {
			expect(LexerHelper.getKeywordByString("VRAI", Language.FR)).toBe(Keyword.TRUE);
			expect(LexerHelper.getKeywordByString("vrai", Language.FR)).toBe(Keyword.TRUE);
			expect(LexerHelper.getKeywordByString("ET", Language.FR)).toBe(Keyword.AND);
		});

		it("returns correct keyword for English strings", () => {
			expect(LexerHelper.getKeywordByString("TRUE", Language.EN)).toBe(Keyword.TRUE);
			expect(LexerHelper.getKeywordByString("true", Language.EN)).toBe(Keyword.TRUE);
			expect(LexerHelper.getKeywordByString("AND", Language.EN)).toBe(Keyword.AND);
		});

		it("returns null for non-keyword strings", () => {
			expect(LexerHelper.getKeywordByString("variable", Language.FR)).toBe(null);
		});
	});

	describe("getTokenTypeForKeyword", () => {
		it("returns correct token type for each keyword", () => {
			expect(LexerHelper.getTokenTypeForKeyword(Keyword.TRUE)).toBe(TokenType.TRUE);
			expect(LexerHelper.getTokenTypeForKeyword(Keyword.FALSE)).toBe(TokenType.FALSE);
			expect(LexerHelper.getTokenTypeForKeyword(Keyword.AND)).toBe(TokenType.AND);
			expect(LexerHelper.getTokenTypeForKeyword(Keyword.OR)).toBe(TokenType.OR);
			expect(LexerHelper.getTokenTypeForKeyword(Keyword.NOT)).toBe(TokenType.NOT);
		});
	});
});
