import ExpressionsBuilder from "../ast/builders/expressions.builder";
import IdentifiersBuilder from "../ast/builders/identifiers.builder";
import LiteralsBuilder from "../ast/builders/literals.builder";
import StatementsBuilder from "../ast/builders/statements.builder";
import { ASTNode } from "../ast/nodes/ast-node";
import { ArithmeticOperator, ComparisonOperator } from "../ast/nodes/expressions";
import {
	ARITHMETIC_OPERATOR_TOKENS_TYPES,
	COMPARISON_OPERATOR_TOKENS_TYPES,
	Token,
	TokenType,
} from "../lexer/tokens";
import BadTokenTypeException from "./exceptions/bad-token-type.exception";
import MissingPrimaryOrLeftParentheseException from "./exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "./exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "./exceptions/parsing-ended-before-eof.exception";

export default class Parser {
	private tokens: Token[];
	private position: number = 0;

	constructor(tokens: Token[]) {
		this.tokens = tokens;
	}

	parse(): ASTNode {
		const ast = this.parseExpr();
		if (!this.at(TokenType.EOF)) {
			const token = this.current();
			throw new ParsingEndedBeforeEOFException(token);
		}
		return ast;
	}

	private parseExpr(): ASTNode {
		return this.parseAssignExpr();
	}

	private parseAssignExpr(): ASTNode {
		const left = this.parseOrExpr();
		if (this.at(TokenType.ASSIGN)) {
			const token = this.consume(TokenType.ASSIGN);
			const right = this.parseOrExpr();
			return StatementsBuilder.buildAssignStatementNode(left, right, token.position);
		}
		return left;
	}

	private parseOrExpr(): ASTNode {
		let left = this.parseAndExpr();
		while (this.at(TokenType.OR)) {
			this.consume(TokenType.OR);
			const right = this.parseAndExpr();
			left = ExpressionsBuilder.buildLogicalExpressionNode("OR", left, right, this.current().position);
		}
		return left;
	}

	private parseAndExpr(): ASTNode {
		let left = this.parseNotExpr();
		while (this.at(TokenType.AND)) {
			this.consume(TokenType.AND);
			const right = this.parseNotExpr();
			left = ExpressionsBuilder.buildLogicalExpressionNode("AND", left, right, this.current().position);
		}
		return left;
	}

	private parseNotExpr(): ASTNode {
		if (this.at(TokenType.NOT)) {
			const tok = this.consume(TokenType.NOT);
			const expr = this.parseNotExpr();
			return ExpressionsBuilder.buildUnaryExpressionNode("NOT", expr, tok.position);
		}
		return this.parseComparisonExpr();
	}
	private parseComparisonExpr(): ASTNode {
		const left = this.parseArithmeticExpr();
		if (this.atAnyComparisonOperator()) {
			const token = this.consumeComparisonOperator();
			const right = this.parseArithmeticExpr();
			return ExpressionsBuilder.buildComparisonExpressionNode(
				token.value as ComparisonOperator,
				left,
				right,
				token.position,
			);
		}

		return left;
	}

	private parseArithmeticExpr(): ASTNode {
		const left = this.parsePrimary();
		if (this.atAnyArithmeticOperator()) {
			const token = this.consumeArithmeticOperator();
			const right = this.parsePrimary();
			return ExpressionsBuilder.buildArithmeticExpressionNode(
				token.value as ArithmeticOperator,
				left,
				right,
				token.position,
			);
		}

		return left;
	}

	private parsePrimary(): ASTNode {
		const token = this.current();

		if (this.at(TokenType.IDENTIFIER)) {
			this.consume(TokenType.IDENTIFIER);
			return IdentifiersBuilder.buildIdentifierNode(token.value, token.position);
		}

		if (this.at(TokenType.TRUE) || this.at(TokenType.FALSE)) {
			this.consume(this.current().type);
			return LiteralsBuilder.buildBooleanNode(token.type === TokenType.TRUE, token.position);
		}

		if (this.at(TokenType.NUMBER)) {
			this.consume(TokenType.NUMBER);
			return LiteralsBuilder.buildNumberNode(parseFloat(token.value), token.position);
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
				throw new MissingRightParentheseException(t.position, t.type === TokenType.EOF);
			}
			this.consume(TokenType.RPAREN);
			return expr;
		}

		throw new MissingPrimaryOrLeftParentheseException(token);
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
		const operatorEntry = Object.values(COMPARISON_OPERATOR_TOKENS_TYPES).find((t) => t === token.type);
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
		const operatorEntry = Object.values(ARITHMETIC_OPERATOR_TOKENS_TYPES).find((t) => t === token.type);
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
}
