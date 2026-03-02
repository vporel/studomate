import EnvVariable from "../environment/env-variable";
import { Environment } from "../environment/environment";
import { Language } from "../lexer/language.enum";
import { Lexer } from "../lexer/lexer";
import Parser from "../parser/parser";
import TypeAnalyserVisitor from "./type-analyser.visitor";

describe("TypeAnalyserVisitor", () => {
	let env: Environment;
	let typeAnalyser: TypeAnalyserVisitor;
	let lexer: Lexer;

	beforeEach(() => {
		const varX = new EnvVariable("id1", "x", "number", "IN");
		const varFlag = new EnvVariable("id2", "flag", "boolean", "IN");
		const varText = new EnvVariable("id3", "text", "string", "IN");
		env = new Environment([varX, varFlag, varText]);
		typeAnalyser = new TypeAnalyserVisitor(env);
		lexer = new Lexer(Language.FR);
	});

	const parseAndAnalyze = (expression: string) => {
		const tokens = lexer.tokenize(expression);
		const parser = new Parser(tokens);
		const ast = parser.parse();
		return typeAnalyser.visit(ast);
	};

	describe("literals", () => {
		it("returns number type for number literals", () => {
			expect(parseAndAnalyze("42")).toBe("number");
			expect(parseAndAnalyze("3.14")).toBe("number");
		});

		it("returns boolean type for boolean literals", () => {
			expect(parseAndAnalyze("VRAI")).toBe("boolean");
			expect(parseAndAnalyze("FAUX")).toBe("boolean");
		});

		it("returns string type for string literals", () => {
			expect(parseAndAnalyze('"hello"')).toBe("string");
		});
	});

	describe("identifiers", () => {
		it("returns inferred type from environment", () => {
			expect(parseAndAnalyze("x")).toBe("number");
			expect(parseAndAnalyze("flag")).toBe("boolean");
			expect(parseAndAnalyze("text")).toBe("string");
		});

		it("returns unknown for undefined variables without environment", () => {
			const visitorNoEnv = new TypeAnalyserVisitor();
			const tokens = lexer.tokenize("unknownVar");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			expect(visitorNoEnv.visit(ast)).toBe("unknown");
		});
	});

	describe("arithmetic expressions", () => {
		it("returns number type for all arithmetic operations", () => {
			expect(parseAndAnalyze("5 + 3")).toBe("number");
			expect(parseAndAnalyze("10 - 4")).toBe("number");
			expect(parseAndAnalyze("6 * 7")).toBe("number");
			expect(parseAndAnalyze("20 / 4")).toBe("number");
		});
	});

	describe("comparison expressions", () => {
		it("returns boolean type for comparisons", () => {
			expect(parseAndAnalyze("x = 10")).toBe("boolean");
			expect(parseAndAnalyze("x != 5")).toBe("boolean");
			expect(parseAndAnalyze("x < 10")).toBe("boolean");
			expect(parseAndAnalyze("x > 5")).toBe("boolean");
			expect(parseAndAnalyze("x <= 10")).toBe("boolean");
			expect(parseAndAnalyze("x >= 5")).toBe("boolean");
		});
	});

	describe("logical expressions", () => {
		it("returns boolean type for logical operations", () => {
			expect(parseAndAnalyze("VRAI ET FAUX")).toBe("boolean");
			expect(parseAndAnalyze("VRAI OU FAUX")).toBe("boolean");
		});
	});

	describe("unary expressions", () => {
		it("returns boolean type for NOT", () => {
			expect(parseAndAnalyze("NON VRAI")).toBe("boolean");
			expect(parseAndAnalyze("NON flag")).toBe("boolean");
		});
	});

	describe("assignment statements", () => {
		it("returns type of right side expression", () => {
			expect(parseAndAnalyze("x := 42")).toBe("number");
			expect(parseAndAnalyze("flag := VRAI")).toBe("boolean");
		});
	});

	describe("timer definitions", () => {
		it("returns boolean type for timer blocks", () => {
			expect(parseAndAnalyze("t1/x/5s")).toBe("boolean");
		});
	});

	describe("complex expressions", () => {
		it("returns correct type for nested expressions", () => {
			expect(parseAndAnalyze("(x + 5) * 2")).toBe("number");
			expect(parseAndAnalyze("(x > 5) ET (flag)")).toBe("boolean");
		});
	});
});
