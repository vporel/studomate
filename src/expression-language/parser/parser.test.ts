import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "../lexer/lexer";
import { TokenType } from "../tokens/tokens";
import MissingPrimaryOrLeftParentheseException from "./exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "./exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "./exceptions/parsing-ended-before-eof.exception";
import Parser from "./parser";

describe("Parser", () => {
	let lexer: Lexer;

	beforeEach(() => {
		lexer = new Lexer(Dialect.FR);
	});

	const parseExpression = (input: string) => {
		const tokens = lexer.tokenize(input);
		const parser = new Parser(tokens);
		return parser.parse();
	};

	describe("literals", () => {
		it("parses number literals", () => {
			const ast = parseExpression("42");
			expect(ast.type).toBe("NUMBER_LITERAL");
			expect((ast as any).value).toBe(42);
		});

		it("parses decimal numbers", () => {
			const ast = parseExpression("3.14");
			expect(ast.type).toBe("NUMBER_LITERAL");
			expect((ast as any).value).toBeCloseTo(3.14);
		});

		it("parses string literals", () => {
			const ast = parseExpression('"hello"');
			expect(ast.type).toBe("STRING_LITERAL");
			expect((ast as any).value).toBe("hello");
		});

		it("parses boolean literals", () => {
			const trueAst = parseExpression("VRAI");
			expect(trueAst.type).toBe("BOOLEAN_LITERAL");
			expect((trueAst as any).value).toBe(true);

			const falseAst = parseExpression("FAUX");
			expect(falseAst.type).toBe("BOOLEAN_LITERAL");
			expect((falseAst as any).value).toBe(false);
		});
	});

	describe("identifiers", () => {
		it("parses identifiers", () => {
			const ast = parseExpression("my_var");
			expect(ast.type).toBe("IDENTIFIER");
			expect((ast as any).value).toBe("my_var");
		});
	});

	describe("arithmetic expressions", () => {
		it("parses addition", () => {
			const ast = parseExpression("5 + 3");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("+");
		});

		it("parses subtraction", () => {
			const ast = parseExpression("10 - 4");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("-");
		});

		it("parses multiplication", () => {
			const ast = parseExpression("6 * 7");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("*");
		});

		it("parses division", () => {
			const ast = parseExpression("20 / 4");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("/");
		});

		it("parses chained additions", () => {
			const ast = parseExpression("1 + 2 + 3");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("+");
			// Left side should be 1 + 2
			expect((ast as any).left.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).left.operator).toBe("+");
		});

		it("parses chained multiplications", () => {
			const ast = parseExpression("2 * 3 * 4");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("*");
			// Left side should be 2 * 3
			expect((ast as any).left.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).left.operator).toBe("*");
		});

		it("respects operator precedence (multiplication before addition)", () => {
			const ast = parseExpression("2 + 3 * 4");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("+");
			// Left side should be 2 (number)
			expect((ast as any).left.type).toBe("NUMBER_LITERAL");
			// Right side should be 3 * 4
			expect((ast as any).right.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).right.operator).toBe("*");
		});

		it("respects operator precedence (division before subtraction)", () => {
			const ast = parseExpression("10 - 6 / 2");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("-");
			// Left side should be 10
			expect((ast as any).left.type).toBe("NUMBER_LITERAL");
			// Right side should be 6 / 2
			expect((ast as any).right.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).right.operator).toBe("/");
		});

		it("parses complex arithmetic with multiple operators", () => {
			const ast = parseExpression("a + b * c - d / e");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("-");
			// Left part: a + b * c
			const left = (ast as any).left;
			expect(left.type).toBe("ARITHMETIC_EXPRESSION");
			expect(left.operator).toBe("+");
			expect(left.right.operator).toBe("*");
			// Right part: d / e
			const right = (ast as any).right;
			expect(right.type).toBe("ARITHMETIC_EXPRESSION");
			expect(right.operator).toBe("/");
		});
	});

	describe("comparison expressions", () => {
		it("parses equality", () => {
			const ast = parseExpression("x = 5");
			expect(ast.type).toBe("COMPARISON_EXPRESSION");
			expect((ast as any).operator).toBe("=");
		});

		it("parses inequality", () => {
			const ast = parseExpression("x != 5");
			expect(ast.type).toBe("COMPARISON_EXPRESSION");
			expect((ast as any).operator).toBe("!=");
		});

		it("parses less than", () => {
			const ast = parseExpression("x < 10");
			expect(ast.type).toBe("COMPARISON_EXPRESSION");
			expect((ast as any).operator).toBe("<");
		});

		it("parses greater than or equal", () => {
			const ast = parseExpression("x >= 10");
			expect(ast.type).toBe("COMPARISON_EXPRESSION");
			expect((ast as any).operator).toBe(">=");
		});
	});

	describe("logical expressions", () => {
		it("parses OR expressions", () => {
			const ast = parseExpression("VRAI OU FAUX");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("OR");
		});

		it("parses AND expressions", () => {
			const ast = parseExpression("VRAI ET FAUX");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("AND");
		});

		it("parses NOT expressions", () => {
			const ast = parseExpression("NON VRAI");
			expect(ast.type).toBe("UNARY_EXPRESSION");
			expect((ast as any).operator).toBe("NOT");
		});

		it("respects precedence (AND before OR)", () => {
			const ast = parseExpression("VRAI OU FAUX ET VRAI");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("OR");
			// Right side should be an AND expression
			expect((ast as any).right.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).right.operator).toBe("AND");
		});
	});

	describe("assignment statements", () => {
		it("parses assignment", () => {
			const ast = parseExpression("x := 42");
			expect(ast.type).toBe("ASSIGN_STATEMENT");
		});

		it("parses assignment with expression", () => {
			const ast = parseExpression("result := a + b");
			expect(ast.type).toBe("ASSIGN_STATEMENT");
		});
	});

	describe("parentheses", () => {
		it("parses parenthesized expressions", () => {
			const ast = parseExpression("(5 + 3)");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
		});

		it("throws on missing right parenthesis", () => {
			expect(() => parseExpression("(5 + 3")).toThrow(
				MissingRightParentheseException,
			);
		});

		it("affects precedence with parentheses", () => {
			// Without parentheses: 2 + 3 * 4 = 2 + (3 * 4)
			// With parentheses: (2 + 3) * 4
			const ast = parseExpression("(VRAI OU FAUX) ET VRAI");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("AND");
			expect((ast as any).left.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).left.operator).toBe("OR");
		});
	});

	describe("timer definitions", () => {
		it("parses simple timer definition", () => {
			const ast = parseExpression("t1/x/5s");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBe("t1");
			expect((ast as any).presetTime).toBe(5000);
		});

		it("parses timer with complex input expression", () => {
			const ast = parseExpression("timer1/a ET b/10s");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBe("timer1");
			expect((ast as any).input.type).toBe("LOGICAL_EXPRESSION");
		});

		it("converts duration units correctly", () => {
			expect((parseExpression("t/x/100ms") as any).presetTime).toBe(100);
			expect((parseExpression("t/x/5s") as any).presetTime).toBe(5000);
			expect((parseExpression("t/x/2m") as any).presetTime).toBe(120000);
			expect((parseExpression("t/x/1h") as any).presetTime).toBe(3600000);
		});
	});

	describe("error handling", () => {
		it("throws on invalid primary", () => {
			const tokens = [
				{ type: TokenType.PLUS, value: "+", position: 0 },
				{ type: TokenType.EOF, value: "", position: 1 },
			];
			const parser = new Parser(tokens);
			expect(() => parser.parse()).toThrow(
				MissingPrimaryOrLeftParentheseException,
			);
		});

		it("throws when parsing doesn't consume all tokens", () => {
			const tokens = [
				{ type: TokenType.NUMBER, value: "5", position: 0 },
				{ type: TokenType.NUMBER, value: "3", position: 2 },
				{ type: TokenType.EOF, value: "", position: 4 },
			];
			const parser = new Parser(tokens);
			expect(() => parser.parse()).toThrow(ParsingEndedBeforeEOFException);
		});
	});

	describe("complex expressions", () => {
		it("parses complex nested expression", () => {
			const ast = parseExpression("(a + b) * (c - d)");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("*");
		});

		it("parses assignment with complex expression", () => {
			const ast = parseExpression("result := (x > 5) ET (y < 10)");
			expect(ast.type).toBe("ASSIGN_STATEMENT");
		});

		it("parses expression with mixed operators and correct precedence", () => {
			// x + y * 2 should be parsed as x + (y * 2)
			const ast = parseExpression("x + y * 2");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("+");
			expect((ast as any).left.type).toBe("IDENTIFIER");
			expect((ast as any).right.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).right.operator).toBe("*");
		});

		it("parses deeply nested arithmetic expression", () => {
			// ((x + y) * 2 - x / 2)
			const ast = parseExpression("(x + y) * 2 - x / 2");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("-");
			// Left: (x + y) * 2
			expect((ast as any).left.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).left.operator).toBe("*");
			// Right: x / 2
			expect((ast as any).right.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).right.operator).toBe("/");
		});

		it("parses comparison with arithmetic expressions on both sides", () => {
			const ast = parseExpression("x + y * 2 > z - 5");
			expect(ast.type).toBe("COMPARISON_EXPRESSION");
			expect((ast as any).operator).toBe(">");
			// Left: x + y * 2
			expect((ast as any).left.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).left.operator).toBe("+");
			// Right: z - 5
			expect((ast as any).right.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).right.operator).toBe("-");
		});

		it("parses complex logical expression with arithmetic", () => {
			const ast = parseExpression("x + 5 > 10 ET y * 2 < 20");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("AND");
			// Left: x + 5 > 10
			expect((ast as any).left.type).toBe("COMPARISON_EXPRESSION");
			// Right: y * 2 < 20
			expect((ast as any).right.type).toBe("COMPARISON_EXPRESSION");
		});
	});
});
