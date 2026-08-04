import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "../../lexer/lexer";
import Parser from "../../parser/parser";
import { DivisionByZeroException } from "../evaluator/exceptions/division-by-zero.exception";
import SimplifierVisitor from "./simplifier.visitor";

describe("SimplifierVisitor", () => {
	let simplifier: SimplifierVisitor;
	let lexer: Lexer;

	beforeEach(() => {
		simplifier = new SimplifierVisitor();
		lexer = new Lexer(Dialect.FR);
	});

	const parseAndSimplify = (expression: string) => {
		const tokens = lexer.tokenize(expression);
		const parser = new Parser(tokens);
		const ast = parser.parse();
		return simplifier.visit(ast);
	};

	describe("literals", () => {
		it("keeps literals unchanged", () => {
			const result = parseAndSimplify("42");
			expect(result.type).toBe("NUMBER_LITERAL");
			expect((result as any).value).toBe(42);
		});

		it("keeps boolean literals unchanged", () => {
			const result = parseAndSimplify("VRAI");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(true);
		});
	});

	describe("identifiers", () => {
		it("keeps identifiers unchanged", () => {
			const result = parseAndSimplify("x");
			expect(result.type).toBe("IDENTIFIER");
			expect((result as any).value).toBe("x");
		});
	});

	describe("arithmetic simplification", () => {
		it("simplifies constant addition", () => {
			const result = parseAndSimplify("5 + 3");
			expect(result.type).toBe("NUMBER_LITERAL");
			expect((result as any).value).toBe(8);
		});

		it("simplifies constant subtraction", () => {
			const result = parseAndSimplify("10 - 4");
			expect(result.type).toBe("NUMBER_LITERAL");
			expect((result as any).value).toBe(6);
		});

		it("simplifies constant multiplication", () => {
			const result = parseAndSimplify("6 * 7");
			expect(result.type).toBe("NUMBER_LITERAL");
			expect((result as any).value).toBe(42);
		});

		it("simplifies constant division", () => {
			const result = parseAndSimplify("20 / 4");
			expect(result.type).toBe("NUMBER_LITERAL");
			expect((result as any).value).toBe(5);
		});

		it("throws on division by zero", () => {
			expect(() => parseAndSimplify("10 / 0")).toThrow(DivisionByZeroException);
		});

		it("keeps expressions with variables", () => {
			const result = parseAndSimplify("x + 5");
			expect(result.type).toBe("ARITHMETIC_EXPRESSION");
		});
	});

	describe("logical simplification", () => {
		it("simplifies constant AND", () => {
			const result = parseAndSimplify("VRAI ET FAUX");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(false);
		});

		it("simplifies constant OR", () => {
			const result = parseAndSimplify("VRAI OU FAUX");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(true);
		});

		it("simplifies true AND x to x", () => {
			const result = parseAndSimplify("VRAI ET x");
			expect(result.type).toBe("IDENTIFIER");
			expect((result as any).value).toBe("x");
		});

		it("simplifies false AND x to false", () => {
			const result = parseAndSimplify("FAUX ET x");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(false);
		});

		it("simplifies x AND true to x", () => {
			const result = parseAndSimplify("x ET VRAI");
			expect(result.type).toBe("IDENTIFIER");
			expect((result as any).value).toBe("x");
		});

		it("simplifies x AND false to false", () => {
			const result = parseAndSimplify("x ET FAUX");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(false);
		});

		it("simplifies true OR x to true", () => {
			const result = parseAndSimplify("VRAI OU x");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(true);
		});

		it("simplifies false OR x to x", () => {
			const result = parseAndSimplify("FAUX OU x");
			expect(result.type).toBe("IDENTIFIER");
			expect((result as any).value).toBe("x");
		});

		it("simplifies x OR true to true", () => {
			const result = parseAndSimplify("x OU VRAI");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(true);
		});

		it("simplifies x OR false to x", () => {
			const result = parseAndSimplify("x OU FAUX");
			expect(result.type).toBe("IDENTIFIER");
			expect((result as any).value).toBe("x");
		});
	});

	describe("unary operations", () => {
		it("simplifies NOT with boolean literal", () => {
			const result = parseAndSimplify("NON VRAI");
			expect(result.type).toBe("BOOLEAN_LITERAL");
			expect((result as any).value).toBe(false);
		});

		it("keeps NOT with non-literal", () => {
			const result = parseAndSimplify("NON x");
			expect(result.type).toBe("UNARY_EXPRESSION");
		});
	});

	describe("complex expressions", () => {
		it("simplifies nested constant expressions", () => {
			const result = parseAndSimplify("(5 + 3) * 2");
			expect(result.type).toBe("NUMBER_LITERAL");
			expect((result as any).value).toBe(16);
		});

		it("partially simplifies mixed expressions", () => {
			const result = parseAndSimplify("x + (5 + 3)");
			expect(result.type).toBe("ARITHMETIC_EXPRESSION");
			// Right side should be simplified to 8
			expect((result as any).right.type).toBe("NUMBER_LITERAL");
			expect((result as any).right.value).toBe(8);
		});

		it("simplifies logical chains with constants", () => {
			const result = parseAndSimplify("x ET VRAI");
			expect(result.type).toBe("IDENTIFIER");
			expect((result as any).value).toBe("x");
		});
	});

	describe("comparison expressions", () => {
		it("keeps comparison expressions unchanged", () => {
			const result = parseAndSimplify("x > 5");
			expect(result.type).toBe("COMPARISON_EXPRESSION");
		});
	});

	describe("assignment statements", () => {
		it("keeps assignment statements unchanged", () => {
			const result = parseAndSimplify("x := 42");
			expect(result.type).toBe("ASSIGN_STATEMENT");
		});
	});
});
