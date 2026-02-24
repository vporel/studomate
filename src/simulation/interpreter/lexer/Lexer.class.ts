import InvalidCharacterException from "./exceptions/InvalidCharacterException.class";
import { InvalidStringEndQuoteException } from "./exceptions/InvalidStringEndQuoteException.class";
import UnterminatedStringException from "./exceptions/UnterminatedStringException.class";
import { Language } from "./Language.enum";
import LexerHelper from "./LexerHelper.class";
import Token from "./tokens/Token.interface";
import {
	ARITHMETIC_OPERATOR_TOKENS_TYPES,
	ARITHMETIC_OPERATORS,
	ArithmeticOperator,
	TokenType,
} from "./tokens/TokenType.enum";

export class Lexer {
	language: Language;

	constructor(language: Language) {
		this.language = language;
	}

	tokenize(input: string): Token[] {
		const tokens: Token[] = [];
		let position = 0;

		while (position < input.length) {
			const char = input[position];

			//Ignore whitespace
			if (/\s/.test(char)) {
				position++;
				continue;
			}

			//Assignment operator
			if (input.startsWith(":=", position)) {
				tokens.push({ type: TokenType.ASSIGN, value: ":=", position });
				position += 2;
				continue;
			}

			//Parentheses
			if (char === "(") {
				tokens.push({ type: TokenType.LPAREN, value: "(", position });
				position++;
				continue;
			}
			if (char === ")") {
				tokens.push({ type: TokenType.RPAREN, value: ")", position });
				position++;
				continue;
			}

			//Arithmetic operators
			if (ARITHMETIC_OPERATORS.includes(char as any)) {
				tokens.push({
					type: ARITHMETIC_OPERATOR_TOKENS_TYPES[char as ArithmeticOperator],
					value: char,
					position,
				});
				position++;
				continue;
			}

			//Comparison operators
			if (input.startsWith("<>", position)) {
				tokens.push({ type: TokenType.NEQ, value: "<>", position });
				position += 2;
				continue;
			}
			if (input.startsWith("<=", position)) {
				tokens.push({ type: TokenType.LTE, value: "<=", position });
				position += 2;
				continue;
			}
			if (input.startsWith(">=", position)) {
				tokens.push({ type: TokenType.GTE, value: ">=", position });
				position += 2;
				continue;
			}
			if (char === "=") {
				tokens.push({ type: TokenType.EQ, value: "=", position });
				position++;
				continue;
			}
			if (char === "<") {
				tokens.push({ type: TokenType.LT, value: "<", position });
				position++;
				continue;
			}
			if (char === ">") {
				tokens.push({ type: TokenType.GT, value: ">", position });
				position++;
				continue;
			}

			//Numbers
			if (LexerHelper.isDigit(char)) {
				const start = position;
				let value = char;
				position++;
				//Whole number part
				while (position < input.length && LexerHelper.isDigit(input[position])) {
					value += input[position];
					position++;
				}
				//Decimal part
				if (position < input.length && input[position] === ".") {
					value += ".";
					position++;
					if (position >= input.length || !LexerHelper.isDigit(input[position])) {
						throw new InvalidCharacterException(input[position] || "end of input", position);
					}
					while (position < input.length && LexerHelper.isDigit(input[position])) {
						value += input[position];
						position++;
					}
				}
				tokens.push({ type: TokenType.NUMBER, value, position: start });
				continue;
			}

			//Strings
			if (LexerHelper.isQuote(char)) {
				const quoteType = char;
				const start = position;
				let value = "";
				position++;
				while (position < input.length && input[position] !== quoteType) {
					value += input[position];
					position++;
				}
				if (position >= input.length) {
					throw new UnterminatedStringException(quoteType, start);
				} else {
					if (input[position] === quoteType) {
						position++;
						tokens.push({ type: TokenType.STRING, value, position: start });
						continue;
					} else {
						throw new InvalidStringEndQuoteException(input[position], position);
					}
				}
			}

			//Identifiers and keywords
			if (LexerHelper.isLetterOrUnderscore(char)) {
				const start = position;
				let value = char;
				position++;
				while (position < input.length && LexerHelper.isLetterOrUnderscoreOrDigit(input[position])) {
					value += input[position];
					position++;
				}
				const keywordsStrings = LexerHelper.getKeywordsStringsForLanguage(this.language);
				if (keywordsStrings.includes(value.toUpperCase())) {
					const keyword = LexerHelper.getKeywordByString(value, this.language);
					if (keyword) {
						const tokenType = LexerHelper.getTokenTypeForKeyword(keyword);
						tokens.push({ type: tokenType, value, position: start });
						continue;
					}
				} else {
					tokens.push({ type: TokenType.IDENTIFIER, value, position: start });
				}
				continue;
			}

			throw new InvalidCharacterException(char, position);
		}
		//Artificial EOF token to simplify parsing and error reporting
		tokens.push({ type: TokenType.EOF, value: "", position });
		return tokens;
	}
}
