import { Keyword } from "@/expression-language/keyword.enum";
import LexerHelper from "./lexer.helper";
import { TokenType } from "./tokens/tokens";

describe("LexerHelper", () => {
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
