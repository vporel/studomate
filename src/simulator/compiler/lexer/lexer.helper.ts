import { Keyword } from "@/expression-language/keyword.enum";
import { TokenType } from "./tokens/tokens";

/**
 * Lexer-specific part of the keyword handling: the mapping from a keyword to the token
 * type it produces.
 *
 * The definition of the language itself — character classes and keyword vocabulary —
 * lives in `@/expression-language`, because it is also needed outside the compilation
 * pipeline (the editor reads expressions while they are still being typed).
 */
export default class LexerHelper {
	private static TOKEN_TYPES_BY_KEYWORD: Record<Keyword, TokenType> = {
		[Keyword.TRUE]: TokenType.TRUE,
		[Keyword.FALSE]: TokenType.FALSE,
		[Keyword.AND]: TokenType.AND,
		[Keyword.OR]: TokenType.OR,
		[Keyword.NOT]: TokenType.NOT,
	};

	static getTokenTypeForKeyword(keyword: Keyword): TokenType {
		return LexerHelper.TOKEN_TYPES_BY_KEYWORD[keyword];
	}
}
