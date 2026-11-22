import BlocksBuilder from "../ast/builders/blocks.builder";
import ExpressionsBuilder from "../ast/builders/expressions.builder";
import IdentifiersBuilder from "../ast/builders/identifiers.builder";
import LiteralsBuilder from "../ast/builders/literals.builder";
import StatementsBuilder from "../ast/builders/statements.builder";
import { ASTNode } from "../ast/nodes/ast-node";
import {
	ARITHMETIC_OPERATOR_TOKENS_TYPES,
	COMPARISON_OPERATOR_TOKENS_TYPES,
	Token,
	TokenType,
} from "../tokens/tokens";
import { ArithmeticOperator, ComparisonOperator } from "../operators";
import { findKeywordDialect } from "../keywords";
import ForeignKeywordException from "./exceptions/foreign-keyword.exception";
import ParserException from "./exceptions/parser.exception";
import BadTokenTypeException from "./exceptions/bad-token-type.exception";
import MissingPrimaryOrLeftParentheseException from "./exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "./exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "./exceptions/parsing-ended-before-eof.exception";
import UnknownFunctionException from "./exceptions/unknown-function.exception";
import MalformedTimerException from "./exceptions/malformed-timer.exception";
import { parseConversionFunctionName } from "../conversions";
import { UNIT_TO_MS } from "../literals/time";

export default class Parser {
	private tokens: Token[];
	private position: number = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): ASTNode {
		try {
			return this.parseWholeExpression();
		} catch (error) {
			throw this.withForeignKeywordHint(error);
		}
	}

	private parseWholeExpression(): ASTNode {
		const ast = this.parseExpr();
		if (!this.at(TokenType.EOF)) {
			const token = this.current();
			throw new ParsingEndedBeforeEOFException(token);
		}
		return ast;
	}

	/**
	 * A word of another dialect's vocabulary lexes as an identifier, so the parser fails away
	 * from it (`NOT a` fails on `a`). When parsing fails, the first such word is reported
	 * instead of the position where the parser gave up.
	 */
	private withForeignKeywordHint(error: unknown): unknown {
		if (!(error instanceof ParserException)) return error;
		const foreign = this.tokens.find(
			(token) =>
				token.type === TokenType.IDENTIFIER &&
				findKeywordDialect(token.value) !== null,
		);
		return foreign
			? new ForeignKeywordException(foreign.value, foreign.position)
			: error;
	}

	private parseExpr(): ASTNode {
		return this.parseAssignExpr();
	}

	private parseAssignExpr(): ASTNode {
		const left = this.parseOrExpr();
		if (this.at(TokenType.ASSIGN)) {
			const token = this.consume(TokenType.ASSIGN);
			const right = this.parseOrExpr();
			return StatementsBuilder.buildAssignStatementNode(
				left,
				right,
				token.position,
			);
		}
		return left;
	}

	private parseOrExpr(): ASTNode {
		let left = this.parseAndExpr();
		while (this.at(TokenType.OR)) {
			const token = this.consume(TokenType.OR);
			const right = this.parseAndExpr();
			left = ExpressionsBuilder.buildLogicalExpressionNode(
				"OR",
				left,
				right,
				token.position,
			);
		}
		return left;
	}

	private parseAndExpr(): ASTNode {
		let left = this.parseNotExpr();
		while (this.at(TokenType.AND)) {
			const token = this.consume(TokenType.AND);
			const right = this.parseNotExpr();
			left = ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				left,
				right,
				token.position,
			);
		}
		return left;
	}

	private parseNotExpr(): ASTNode {
		if (this.at(TokenType.NOT)) {
			const tok = this.consume(TokenType.NOT);
			const expr = this.parseNotExpr();
			return ExpressionsBuilder.buildUnaryExpressionNode(
				"NOT",
				expr,
				tok.position,
			);
		}
		return this.parseComparisonExpr();
	}
	private parseComparisonExpr(): ASTNode {
		const left = this.parseAddSubExpr();
		if (this.atAnyComparisonOperator()) {
			const token = this.consumeComparisonOperator();
			const right = this.parseAddSubExpr();
			return ExpressionsBuilder.buildComparisonExpressionNode(
				token.value as ComparisonOperator,
				left,
				right,
				token.position,
			);
		}

		return left;
	}

	private parseAddSubExpr(): ASTNode {
		let left = this.parseMulDivExpr();
		while (this.at(TokenType.PLUS) || this.at(TokenType.MINUS)) {
			const token = this.consumeArithmeticOperator();
			const right = this.parseMulDivExpr();
			left = ExpressionsBuilder.buildArithmeticExpressionNode(
				token.value as ArithmeticOperator,
				left,
				right,
				token.position,
			);
		}
		return left;
	}

	private parseMulDivExpr(): ASTNode {
		let left = this.parseUnaryExpr();
		while (this.at(TokenType.MUL) || this.at(TokenType.SLASH)) {
			const token = this.consumeArithmeticOperator();
			const right = this.parseUnaryExpr();
			left = ExpressionsBuilder.buildArithmeticExpressionNode(
				token.value as ArithmeticOperator,
				left,
				right,
				token.position,
			);
		}
		return left;
	}

	private parseUnaryExpr(): ASTNode {
		if (this.at(TokenType.MINUS)) {
			const tok = this.consume(TokenType.MINUS);
			const expr = this.parseUnaryExpr();
			return ExpressionsBuilder.buildUnaryExpressionNode(
				"-",
				expr,
				tok.position,
			);
		}
		return this.parsePrimary();
	}

	private parsePrimary(): ASTNode {
		const token = this.current();

		if (this.at(TokenType.IDENTIFIER)) {
			if (this.isTimerPattern()) {
				return this.parseTimerDefinition();
			}
			if (
				this.tokens[this.position + 1]?.type === TokenType.SLASH &&
				this.tokens[this.position + 2]?.type === TokenType.DURATION
			) {
				throw new MalformedTimerException(token.position);
			}
			if (this.tokens[this.position + 1]?.type === TokenType.LPAREN) {
				return this.parseFunctionCall();
			}
			this.consume(TokenType.IDENTIFIER);
			return IdentifiersBuilder.buildIdentifierNode(
				token.value,
				token.position,
			);
		}

		if (this.at(TokenType.TRUE) || this.at(TokenType.FALSE)) {
			this.consume(this.current().type);
			return LiteralsBuilder.buildBooleanNode(
				token.type === TokenType.TRUE,
				token.position,
			);
		}

		if (this.at(TokenType.NUMBER)) {
			this.consume(TokenType.NUMBER);
			return LiteralsBuilder.buildNumberNode(
				parseFloat(token.value),
				token.position,
				token.value.includes(".") ? "real" : "integer",
			);
		}

		if (this.at(TokenType.DURATION)) {
			if (this.isDurationFirstTimerPattern()) {
				return this.parseDurationFirstTimerDefinition();
			}
			throw new MalformedTimerException(token.position);
		}

		if (this.at(TokenType.TIME_LITERAL)) {
			this.consume(TokenType.TIME_LITERAL);
			return LiteralsBuilder.buildNumberNode(
				Number(token.value),
				token.position,
				"time",
			);
		}

		if (this.at(TokenType.STRING)) {
			this.consume(TokenType.STRING);
			return LiteralsBuilder.buildStringNode(token.value, token.position);
		}

		if (this.at(TokenType.LPAREN)) {
			this.consume(TokenType.LPAREN);
			// We wait a complete expression in the parenthses
			const expr = this.parseExpr();
			// Then we expect a right parenthese, if not it's an error
			if (!this.at(TokenType.RPAREN)) {
				const t = this.current();
				throw new MissingRightParentheseException(
					t.position,
					t.type === TokenType.EOF,
				);
			}
			this.consume(TokenType.RPAREN);
			return expr;
		}

		throw new MissingPrimaryOrLeftParentheseException(token);
	}

	/** Only the standard's conversion functions exist: `DINT_TO_INT(expr)`. */
	private parseFunctionCall(): ASTNode {
		const nameToken = this.consume(TokenType.IDENTIFIER);
		const conversion = parseConversionFunctionName(nameToken.value);
		if (!conversion)
			throw new UnknownFunctionException(nameToken.value, nameToken.position);
		this.consume(TokenType.LPAREN);
		const argument = this.parseExpr();
		if (!this.at(TokenType.RPAREN)) {
			const t = this.current();
			throw new MissingRightParentheseException(
				t.position,
				t.type === TokenType.EOF,
			);
		}
		this.consume(TokenType.RPAREN);
		return ExpressionsBuilder.buildConversionExpressionNode(
			conversion.source,
			conversion.target,
			argument,
			nameToken.position,
		);
	}

	/** `t1/X1/5s` */
	private isTimerPattern(): boolean {
		const p = this.position;
		if (
			this.tokens[p]?.type !== TokenType.IDENTIFIER ||
			this.tokens[p + 1]?.type !== TokenType.SLASH
		) {
			return false;
		}
		const inputEnd = this.findTimerInputEnd(p + 2);
		return (
			inputEnd !== -1 &&
			this.tokens[inputEnd + 1]?.type === TokenType.SLASH &&
			this.tokens[inputEnd + 2]?.type === TokenType.DURATION
		);
	}

	/** `5s/X1` */
	private isDurationFirstTimerPattern(): boolean {
		const p = this.position;
		return (
			this.tokens[p]?.type === TokenType.DURATION &&
			this.tokens[p + 1]?.type === TokenType.SLASH &&
			this.findTimerInputEnd(p + 2) !== -1
		);
	}

	/**
	 * Index of the last token of a timer input starting at `start`, or -1 if there is none.
	 * The input is a lone atomic value (identifier, boolean) or a parenthesized expression, never
	 * a bare compound expression: otherwise a `/` of the timer could not be told apart from a
	 * division further in the enclosing expression.
	 */
	private findTimerInputEnd(start: number): number {
		const type = this.tokens[start]?.type;
		if (
			type === TokenType.IDENTIFIER ||
			type === TokenType.TRUE ||
			type === TokenType.FALSE
		) {
			return start;
		}
		if (type === TokenType.LPAREN) {
			return this.findMatchingParenIndex(start);
		}
		return -1;
	}

	private findMatchingParenIndex(openIndex: number): number {
		let depth = 0;
		for (let i = openIndex; i < this.tokens.length; i++) {
			if (this.tokens[i].type === TokenType.LPAREN) {
				depth++;
			} else if (this.tokens[i].type === TokenType.RPAREN) {
				depth--;
				if (depth === 0) {
					return i;
				}
			}
		}
		return -1;
	}

	private parseTimerDefinition(): ASTNode {
		const startPos = this.current().position;

		const timerIdToken = this.consume(TokenType.IDENTIFIER);
		this.consume(TokenType.SLASH);

		const inputExpr = this.parseTimerInput();

		this.consume(TokenType.SLASH);
		const durationToken = this.consume(TokenType.DURATION);

		return BlocksBuilder.buildTimerStringDeclarationNode(
			timerIdToken.value,
			inputExpr,
			this.convertDurationToMs(durationToken.value),
			startPos,
		);
	}

	private parseDurationFirstTimerDefinition(): ASTNode {
		const durationToken = this.consume(TokenType.DURATION);
		this.consume(TokenType.SLASH);
		const inputExpr = this.parseTimerInput();

		return BlocksBuilder.buildTimerStringDeclarationNode(
			null,
			inputExpr,
			this.convertDurationToMs(durationToken.value),
			durationToken.position,
		);
	}

	/**
	 * An identifier input is read as a bare identifier, never through `parsePrimary`: there it
	 * could start a nested timer (`5s/t1/X1/5s`) or a function call.
	 */
	private parseTimerInput(): ASTNode {
		const token = this.current();
		if (this.at(TokenType.LPAREN)) {
			return this.parsePrimary();
		}
		if (this.at(TokenType.IDENTIFIER)) {
			this.consume(TokenType.IDENTIFIER);
			return IdentifiersBuilder.buildIdentifierNode(
				token.value,
				token.position,
			);
		}
		this.consume(token.type);
		return LiteralsBuilder.buildBooleanNode(
			token.type === TokenType.TRUE,
			token.position,
		);
	}

	private current(): Token {
		return this.tokens[this.position];
	}

	private at(type: TokenType): boolean {
		return this.current().type === type;
	}

	private atAnyComparisonOperator(): boolean {
		const type = this.current().type;
		return Object.values(COMPARISON_OPERATOR_TOKENS_TYPES).includes(type);
	}

	private atAnyArithmeticOperator(): boolean {
		const type = this.current().type;
		return Object.values(ARITHMETIC_OPERATOR_TOKENS_TYPES).includes(type);
	}

	private consume(type: TokenType): Token {
		const token = this.current();
		if (token.type === type) {
			this.position++;
			return token;
		}
		throw new BadTokenTypeException([type], token.type, token.position);
	}

	private consumeComparisonOperator(): Token {
		const token = this.current();
		const operatorEntry = Object.values(COMPARISON_OPERATOR_TOKENS_TYPES).find(
			(t) => t === token.type,
		);
		if (operatorEntry) {
			this.position++;
			return token;
		}
		throw new BadTokenTypeException(
			Object.values(COMPARISON_OPERATOR_TOKENS_TYPES),
			token.type,
			token.position,
		);
	}

	private consumeArithmeticOperator(): Token {
		const token = this.current();
		const operatorEntry = Object.values(ARITHMETIC_OPERATOR_TOKENS_TYPES).find(
			(t) => t === token.type,
		);
		if (operatorEntry) {
			this.position++;
			return token;
		}
		throw new BadTokenTypeException(
			Object.values(ARITHMETIC_OPERATOR_TOKENS_TYPES),
			token.type,
			token.position,
		);
	}

	private convertDurationToMs(durationStr: string): number {
		const value = parseFloat(durationStr);
		const unit = durationStr.replace(/[0-9.]/g, "").toLowerCase();

		return value * (UNIT_TO_MS[unit] ?? 1);
	}
}
