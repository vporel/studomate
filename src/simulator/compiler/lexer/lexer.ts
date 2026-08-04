import { ARITHMETIC_OPERATORS, ArithmeticOperator } from "../shared/operators";
import InvalidCharacterException from "./exceptions/invalid-character.exception";
import InvalidStringEndQuoteException from "./exceptions/invalid-string-end-quote.exception";
import UnterminatedStringException from "./exceptions/unterminated-string.exception";
import {
	isDigit,
	isLetterOrUnderscore,
	isLetterOrUnderscoreOrDigit,
	isQuote,
} from "@/expression-language/alphabet";
import { getKeywordByString, getKeywordsStringsForDialect } from "@/expression-language/keywords";
import { Dialect } from "@/expression-language/dialect.enum";
import LexerHelper from "./lexer.helper";
import { ARITHMETIC_OPERATOR_TOKENS_TYPES, Token, TokenType } from "./tokens/tokens";

export class Lexer {
	dialect: Dialect;

	constructor(dialect: Dialect) {
		this.dialect = dialect;
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
			if (input.startsWith("!=", position)) {
				tokens.push({ type: TokenType.NEQ, value: "!=", position });
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
			if (isDigit(char)) {
				const start = position;
				let value = char;
				position++;
				//Whole number part
				while (position < input.length && isDigit(input[position])) {
					value += input[position];
					position++;
				}
				//Decimal part
				if (position < input.length && input[position] === ".") {
					value += ".";
					position++;
					if (position >= input.length || !isDigit(input[position])) {
						throw new InvalidCharacterException(input[position] || "end of input", position);
					}
					while (position < input.length && isDigit(input[position])) {
						value += input[position];
						position++;
					}
				}
				//Duration
				const durationMatch = input.slice(position).match(/^(ms|s|m|h|d)/);
				if (durationMatch) {
					const unit = durationMatch[0];
					tokens.push({
						type: TokenType.DURATION,
						value: value + unit,
						position: start,
					});
					position += unit.length; // We move the position past the duration unit
				} else {
					//Otherwise, it's just a number
					tokens.push({ type: TokenType.NUMBER, value, position: start });
				}

				continue;
			}

			//Strings
			if (isQuote(char)) {
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
			if (isLetterOrUnderscore(char)) {
				const start = position;
				let value = char;
				position++;
				while (position < input.length && isLetterOrUnderscoreOrDigit(input[position])) {
					value += input[position];
					position++;
				}
				const keywordsStrings = getKeywordsStringsForDialect(this.dialect);
				if (keywordsStrings.includes(value.toUpperCase())) {
					const keyword = getKeywordByString(value, this.dialect);
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
