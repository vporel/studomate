import Token from "../lexer/tokens/Token.interface";
import {
	ARITHMETIC_OPERATOR_TOKENS_TYPES,
	ArithmeticOperator,
	COMPARISON_OPERATOR_TOKENS_TYPES,
	ComparisonOperator,
	TokenType,
} from "../lexer/tokens/TokenType.enum";
import { ASTNode } from "./AST";
import BadTokenTypeException from "./exceptions/BadTokenTypeException.class";
import MissingPrimaryOrLeftParentheseException from "./exceptions/MissingPrimaryOrLeftParentheseException.class";
import MissingRightParentheseException from "./exceptions/MissingRightParentheseException.class";
import ParsingEndedBeforeEOFException from "./exceptions/ParsingEndedBeforeEOFException.class";

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
			return { type: "ASSIGN", left, right, position: token.position };
		}
		return left;
	}

	private parseOrExpr(): ASTNode {
		let left = this.parseAndExpr();
		while (this.at(TokenType.OR)) {
			this.consume(TokenType.OR);
			const right = this.parseAndExpr();
			left = { type: "OR", left, right, position: this.current().position };
		}
		return left;
	}

	private parseAndExpr(): ASTNode {
		let left = this.parseNotExpr();
		while (this.at(TokenType.AND)) {
			this.consume(TokenType.AND);
			const right = this.parseNotExpr();
			left = { type: "AND", left, right, position: this.current().position };
		}
		return left;
	}

	private parseNotExpr(): ASTNode {
		if (this.at(TokenType.NOT)) {
			const tok = this.consume(TokenType.NOT);
			const expr = this.parseNotExpr();
			return { type: "NOT", expr, position: tok.position };
		}
		return this.parseComparisonExpr();
	}
	private parseComparisonExpr(): ASTNode {
		const left = this.parseArithmeticExpr();
		if (this.atAnyComparisonOperator()) {
			const token = this.consumeComparisonOperator();
			const right = this.parseArithmeticExpr();

			return {
				type: "COMPARE",
				operator: token.value as ComparisonOperator,
				left,
				right,
				position: token.position,
			};
		}

		return left;
	}

	private parseArithmeticExpr(): ASTNode {
		const left = this.parsePrimary();
		if (this.atAnyArithmeticOperator()) {
			const token = this.consumeArithmeticOperator();
			const right = this.parsePrimary();

			return {
				type: "ARITHMETIC",
				operator: token.value as ArithmeticOperator,
				left,
				right,
				position: token.position,
			};
		}

		return left;
	}

	private parsePrimary(): ASTNode {
		const token = this.current();

		if (this.at(TokenType.IDENTIFIER)) {
			this.consume(TokenType.IDENTIFIER);
			return { type: "IDENTIFIER", value: token.value, position: token.position };
		}

		if (this.at(TokenType.TRUE) || this.at(TokenType.FALSE)) {
			this.consume(this.current().type);
			return { type: "BOOLEAN", value: token.type === TokenType.TRUE, position: token.position };
		}

		if (this.at(TokenType.NUMBER)) {
			this.consume(TokenType.NUMBER);
			return { type: "NUMBER", value: parseFloat(token.value), position: token.position };
		}

		if (this.at(TokenType.STRING)) {
			this.consume(TokenType.STRING);
			return { type: "STRING", value: token.value, position: token.position };
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
