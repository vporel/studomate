import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "../lexer/lexer";
import { TokenType } from "../tokens/tokens";
import ForeignKeywordException from "./exceptions/foreign-keyword.exception";
import MissingPrimaryOrLeftParentheseException from "./exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "./exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "./exceptions/parsing-ended-before-eof.exception";
import Parser from "./parser";
import UnknownFunctionException from "./exceptions/unknown-function.exception";
import MalformedTimerException from "./exceptions/malformed-timer.exception";

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

		it("parses a standalone unary minus", () => {
			const ast = parseExpression("-5");
			expect(ast.type).toBe("UNARY_EXPRESSION");
			expect((ast as any).operator).toBe("-");
			expect((ast as any).expr.type).toBe("NUMBER_LITERAL");
			expect((ast as any).expr.value).toBe(5);
		});

		it("parses unary minus as a multiplication operand", () => {
			const ast = parseExpression("a * -1");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("*");
			expect((ast as any).right.type).toBe("UNARY_EXPRESSION");
			expect((ast as any).right.operator).toBe("-");
		});

		it("distinguishes unary minus from binary subtraction", () => {
			const ast = parseExpression("a - -5");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("-");
			expect((ast as any).left.type).toBe("IDENTIFIER");
			expect((ast as any).right.type).toBe("UNARY_EXPRESSION");
			expect((ast as any).right.operator).toBe("-");
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

		it("positions the OR node at the operator, not past the right operand", () => {
			const ast = parseExpression("a OU b");
			expect((ast as any).position).toBe(2);
		});

		it("positions the AND node at the operator, not past the right operand", () => {
			const ast = parseExpression("a ET b");
			expect((ast as any).position).toBe(2);
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

		it("parses timer with a parenthesized complex input expression", () => {
			const ast = parseExpression("timer1/(a ET b)/10s");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBe("timer1");
			expect((ast as any).input.type).toBe("LOGICAL_EXPRESSION");
		});

		it("parses a parenthesized timer input longer than the old fixed lookahead window", () => {
			const ast = parseExpression("t1/(a ET b ET c ET d ET e)/5s");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBe("t1");
			expect((ast as any).presetTime).toBe(5000);
			expect((ast as any).input.type).toBe("LOGICAL_EXPRESSION");
		});

		it("rejects a compound timer input written without parentheses", () => {
			expect(() => parseExpression("timer1/a ET b/10s")).toThrow();
		});

		it("does not confuse a division followed by an unrelated timer with the timer's own input", () => {
			const ast = parseExpression("debit / 2 ET t1 / X1 / 5s");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("AND");
			expect((ast as any).left.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).left.operator).toBe("/");
			expect((ast as any).left.left.value).toBe("debit");
			expect((ast as any).right.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).right.name).toBe("t1");
			expect((ast as any).right.input.value).toBe("X1");
			expect((ast as any).right.presetTime).toBe(5000);
		});

		it("rejects a duration glued to a following identifier instead of silently splitting it", () => {
			expect(() => parseExpression("Test ET t1/X1/2sET X2")).toThrow();
		});

		it("converts duration units correctly", () => {
			expect((parseExpression("t/x/100ms") as any).presetTime).toBe(100);
			expect((parseExpression("t/x/5s") as any).presetTime).toBe(5000);
			expect((parseExpression("t/x/2m") as any).presetTime).toBe(120000);
			expect((parseExpression("t/x/1h") as any).presetTime).toBe(3600000);
			expect((parseExpression("t/x/1d") as any).presetTime).toBe(86400000);
		});

		it("reads a/b/5s as a timer named a, not as a division", () => {
			const ast = parseExpression("a/b/5s");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBe("a");
			expect((ast as any).input.value).toBe("b");
		});

		it("accepts a boolean literal as the input of a named timer", () => {
			const ast = parseExpression("t1/VRAI/5s");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).input.type).toBe("BOOLEAN_LITERAL");
		});
	});

	describe("timer definitions written duration first (5s/X1)", () => {
		it("parses a timer without a name", () => {
			const ast = parseExpression("5s/X1");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBeNull();
			expect((ast as any).input.type).toBe("IDENTIFIER");
			expect((ast as any).input.value).toBe("X1");
			expect((ast as any).presetTime).toBe(5000);
			expect((ast as any).position).toBe(0);
		});

		it("converts duration units, including decimals, and tells ms apart from m", () => {
			expect((parseExpression("1.5s/X1") as any).presetTime).toBe(1500);
			expect((parseExpression("200ms/X1") as any).presetTime).toBe(200);
			expect((parseExpression("5ms/X1") as any).presetTime).toBe(5);
			expect((parseExpression("5m/X1") as any).presetTime).toBe(300000);
			expect((parseExpression("1h/X1") as any).presetTime).toBe(3600000);
		});

		it("accepts a parenthesized compound input", () => {
			const ast = parseExpression("5s/(X1 ET X2)");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).name).toBeNull();
			expect((ast as any).input.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).input.operator).toBe("AND");
		});

		it("accepts a boolean literal as input", () => {
			const ast = parseExpression("5s/VRAI");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).input.type).toBe("BOOLEAN_LITERAL");
			expect((ast as any).input.value).toBe(true);
		});

		it("takes only the atomic input, the rest of the expression applies to the timer", () => {
			const ast = parseExpression("5s/X1 ET X2");
			expect(ast.type).toBe("LOGICAL_EXPRESSION");
			expect((ast as any).operator).toBe("AND");
			expect((ast as any).left.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).left.input.value).toBe("X1");
			expect((ast as any).right.value).toBe("X2");
		});

		it("combines with OR and NOT like any boolean operand", () => {
			const or = parseExpression("X3 OU 5s/X1");
			expect(or.type).toBe("LOGICAL_EXPRESSION");
			expect((or as any).operator).toBe("OR");
			expect((or as any).right.type).toBe("TIMER_STRING_DECLARATION");

			const not = parseExpression("NON 5s/X1");
			expect(not.type).toBe("UNARY_EXPRESSION");
			expect((not as any).operator).toBe("NOT");
			expect((not as any).expr.type).toBe("TIMER_STRING_DECLARATION");
		});

		it("accepts the timer inside parentheses", () => {
			const ast = parseExpression("(5s/X1)");
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
		});

		it("parses both forms side by side", () => {
			const ast = parseExpression("t1/X1/5s ET 2s/X2");
			expect((ast as any).left.name).toBe("t1");
			expect((ast as any).left.presetTime).toBe(5000);
			expect((ast as any).right.name).toBeNull();
			expect((ast as any).right.presetTime).toBe(2000);
		});

		it("parses the English dialect's keywords in the input", () => {
			const enLexer = new Lexer(Dialect.EN);
			const ast = new Parser(enLexer.tokenize("5s/(X1 AND TRUE)")).parse();
			expect(ast.type).toBe("TIMER_STRING_DECLARATION");
			expect((ast as any).input.operator).toBe("AND");
		});

		it("parses a timer applied to an arithmetic result as such, leaving the type error to the semantic analysis", () => {
			const ast = parseExpression("5s/X1 + 1");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).left.type).toBe("TIMER_STRING_DECLARATION");
		});
	});

	describe("expressions that must not be read as a timer", () => {
		it("keeps a number divided by an identifier as a division", () => {
			const ast = parseExpression("10/X1");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("/");
		});

		it("keeps a T# constant divided by an identifier as a division", () => {
			const ast = parseExpression("T#5s/X1");
			expect(ast.type).toBe("ARITHMETIC_EXPRESSION");
			expect((ast as any).operator).toBe("/");
			expect((ast as any).left.kind).toBe("time");
		});

		it("rejects a duration on its own", () => {
			expect(() => parseExpression("5s")).toThrow(MalformedTimerException);
		});

		it("rejects a duration followed by a slash and nothing", () => {
			expect(() => parseExpression("5s/")).toThrow(MalformedTimerException);
		});

		it("rejects a number as timer input", () => {
			expect(() => parseExpression("5s/1")).toThrow(MalformedTimerException);
		});

		it("rejects a compound input written without parentheses", () => {
			expect(() => parseExpression("5s/-X1")).toThrow(MalformedTimerException);
		});

		it("rejects the rise-and-fall delay form 5s/X1/2s instead of reading a division", () => {
			expect(() => parseExpression("5s/X1/2s")).toThrow(
				MalformedTimerException,
			);
		});

		it("rejects the duration written after the input without a name (X1/5s)", () => {
			expect(() => parseExpression("X1/5s")).toThrow(MalformedTimerException);
		});

		it("rejects a mix of both forms (t1/5s/X1) instead of reading t1 divided by a timer", () => {
			let error: unknown;
			try {
				parseExpression("t1/5s/X1");
			} catch (e) {
				error = e;
			}
			expect(error).toBeInstanceOf(MalformedTimerException);
			expect((error as MalformedTimerException).getPosition()).toBe(0);
		});

		it("never reads a named timer as the input of an anonymous one (5s/t1/X1/5s)", () => {
			expect(() => parseExpression("5s/t1/X1/5s")).toThrow(
				MalformedTimerException,
			);
		});

		it("rejects a duration glued to the next word instead of silently splitting it", () => {
			expect(() => parseExpression("5sET X1")).toThrow();
		});

		it("reads an input glued to a keyword as a single identifier", () => {
			expect((parseExpression("5s/X1ET") as any).input.value).toBe("X1ET");
		});

		it("rejects an upper-case unit, which is not a duration", () => {
			expect(() => parseExpression("5S/X1")).toThrow();
		});

		it("rejects a space between the number and its unit", () => {
			expect(() => parseExpression("5 s/X1")).toThrow();
		});

		it("rejects a compound named-timer input written without parentheses with a timer error", () => {
			expect(() => parseExpression("timer1/a ET b/10s")).toThrow(
				MalformedTimerException,
			);
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

	describe("types des littéraux numériques", () => {
		it("marque un littéral écrit avec une partie décimale comme réel, même entier", () => {
			expect(parseExpression("2.0")).toMatchObject({
				type: "NUMBER_LITERAL",
				value: 2,
				kind: "real",
			});
			expect(parseExpression("2")).toMatchObject({ value: 2, kind: "integer" });
		});

		it("lit une constante T# comme un littéral de genre time", () => {
			expect(parseExpression("T#2s")).toMatchObject({
				type: "NUMBER_LITERAL",
				value: 2000,
				kind: "time",
			});
		});
	});

	describe("fonctions de conversion", () => {
		it("lit un appel de conversion de la norme", () => {
			const ast = parseExpression("DINT_TO_INT(x * 2)");
			expect(ast).toMatchObject({
				type: "CONVERSION_EXPRESSION",
				sourceType: "DINT",
				targetType: "INT",
				expr: { type: "ARITHMETIC_EXPRESSION", operator: "*" },
			});
		});

		it("reconnaît le nom sans tenir compte de la casse", () => {
			expect(parseExpression("int_to_real(x)")).toMatchObject({
				type: "CONVERSION_EXPRESSION",
				sourceType: "INT",
				targetType: "REAL",
			});
		});

		it("utilise une conversion dans une expression plus large", () => {
			const ast = parseExpression("n := REAL_TO_INT(r) + 1");
			expect(ast).toMatchObject({
				type: "ASSIGN_STATEMENT",
				right: {
					type: "ARITHMETIC_EXPRESSION",
					left: { type: "CONVERSION_EXPRESSION", targetType: "INT" },
				},
			});
		});

		it("lève UnknownFunctionException pour une fonction inconnue ou une conversion non prise en charge", () => {
			expect(() => parseExpression("FOO(x)")).toThrow(UnknownFunctionException);
			expect(() => parseExpression("REAL_TO_WORD(x)")).toThrow(
				UnknownFunctionException,
			);
		});

		it("lève MissingRightParentheseException si l'appel n'est pas fermé", () => {
			expect(() => parseExpression("DINT_TO_INT(x")).toThrow(
				MissingRightParentheseException,
			);
		});
	});

	describe("mot-clé d'un autre dialecte", () => {
		const foreignWord = (input: string) => {
			try {
				parseExpression(input);
			} catch (error) {
				return error instanceof ForeignKeywordException
					? { word: error.getWord(), position: error.getPosition() }
					: error;
			}
			return null;
		};

		it("signale AND dans une expression française, à sa position", () => {
			expect(foreignWord("a AND b")).toEqual({ word: "AND", position: 2 });
		});

		it("signale NOT même quand le parseur échoue sur l'opérande qui le suit", () => {
			expect(foreignWord("NOT a")).toEqual({ word: "NOT", position: 0 });
		});

		it("signale le mot-clé quand l'échec est une parenthèse manquante", () => {
			expect(foreignWord("(a OR b)")).toEqual({ word: "OR", position: 3 });
		});

		it("signale le premier mot-clé étranger quand il y en a plusieurs", () => {
			expect(foreignWord("a AND b OR c")).toEqual({
				word: "AND",
				position: 2,
			});
		});

		it("laisse l'exception d'origine quand aucun mot étranger n'est en cause", () => {
			expect(() => parseExpression("a b")).toThrow(
				ParsingEndedBeforeEOFException,
			);
		});

		it("ne dit rien d'une expression valide dans son dialecte", () => {
			expect(() => parseExpression("a ET NON b")).not.toThrow();
		});

		it("accepte un mot de l'autre dialecte employé comme identifiant valide", () => {
			expect(() => parseExpression("AND")).not.toThrow();
		});
	});
});
