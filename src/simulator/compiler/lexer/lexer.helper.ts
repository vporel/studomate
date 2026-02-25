import { Keyword } from "./keyword.enum";
import { Language } from "./language.enum";
import { TokenType } from "./tokens";

export default class LexerHelper {
	static isLetterOrUnderscore(char: string): boolean {
		return /^[a-zA-Z_]$/.test(char);
	}

	static isLetterOrUnderscoreOrDigit(char: string): boolean {
		return /^[a-zA-Z0-9_]$/.test(char);
	}

	static isDigit(char: string): boolean {
		return /^[0-9]$/.test(char);
	}

	static isQuote(char: string): boolean {
		return char === '"' || char === "'";
	}

	private static KEYWORDS_BY_LANGUAGE: Record<Language, Record<Keyword, string>> = {
		[Language.FR]: {
			[Keyword.TRUE]: "VRAI",
			[Keyword.FALSE]: "FAUX",
			[Keyword.AND]: "ET",
			[Keyword.OR]: "OU",
			[Keyword.NOT]: "NON",
		},
		[Language.EN]: {
			[Keyword.TRUE]: "TRUE",
			[Keyword.FALSE]: "FALSE",
			[Keyword.AND]: "AND",
			[Keyword.OR]: "OR",
			[Keyword.NOT]: "NOT",
		},
	};

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

	static getKeywordsStringsForLanguage(language: Language): string[] {
		return Object.values(LexerHelper.KEYWORDS_BY_LANGUAGE[language]);
	}

	static getKeywordByString(value: string, language: Language): Keyword | null {
		const keywordsForLanguage = LexerHelper.KEYWORDS_BY_LANGUAGE[language];
		for (const [keyword, keywordString] of Object.entries(keywordsForLanguage)) {
			if (keywordString.toUpperCase() === value.toUpperCase()) {
				return keyword as Keyword;
			}
		}
		return null;
	}
}
