import EnvVariable from "../environment/env-variable";
import { Environment } from "../environment/environment";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import IncompatibleOperandsTypesException from "./exceptions/incompatible-operands-types.exception";
import InputIdentifierAssignmentException from "./exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "./exceptions/invalid-assignment-target.exception";
import InvalidBinaryExprOperandTypeException from "./exceptions/invalid-binary-expr-operand-type.exception";
import InvalidUnaryExprOperandTypeException from "./exceptions/invalid-unary-expr-operand-type.exception";
import UnauthorizedNodeException from "./exceptions/unauthorized-node.exception";
import UnknownIdentifierException from "./exceptions/unknown-identifier.exception";
import SemanticAnalyserVisitor from "./semantic-analyser.visitor";

describe("SemanticAnalyserVisitor", () => {
	let env: Environment;
	let analyser: SemanticAnalyserVisitor;
	let lexer: Lexer;

	beforeEach(() => {
		const varX = new EnvVariable("id1", "x", "number", "IN");
		const varY = new EnvVariable("id2", "y", "number", "INOUT");
		const varFlag = new EnvVariable("id3", "flag", "boolean", "IN");
		const varResult = new EnvVariable("id4", "result", "number", "OUT");
		const varBoolResult = new EnvVariable("id5", "boolResult", "boolean", "OUT");
		env = new Environment([varX, varY, varFlag, varResult, varBoolResult]);
		analyser = new SemanticAnalyserVisitor(env);
		lexer = new Lexer(Dialect.FR);
	});

	const parseAndCheck = (expression: string) => {
		const tokens = lexer.tokenize(expression);
		const parser = new Parser(tokens);
		const ast = parser.parse();
		analyser.visit(ast);
	};

	describe("valid expressions", () => {
		it("accepts valid identifiers", () => {
			expect(() => parseAndCheck("x")).not.toThrow();
			expect(() => parseAndCheck("flag")).not.toThrow();
		});

		it("accepts valid arithmetic expressions", () => {
			expect(() => parseAndCheck("x + y")).not.toThrow();
			expect(() => parseAndCheck("x * 5")).not.toThrow();
		});

		it("accepts valid comparison expressions", () => {
			expect(() => parseAndCheck("x = 10")).not.toThrow();
			expect(() => parseAndCheck("x < y")).not.toThrow();
		});

		it("accepts valid logical expressions", () => {
			expect(() => parseAndCheck("VRAI ET FAUX")).not.toThrow();
			expect(() => parseAndCheck("flag OU VRAI")).not.toThrow();
		});

		it("accepts valid NOT expressions", () => {
			expect(() => parseAndCheck("NON flag")).not.toThrow();
		});

		it("accepts valid assignments", () => {
			expect(() => parseAndCheck("result := x + 5")).not.toThrow();
			expect(() => parseAndCheck("y := 10")).not.toThrow();
		});
	});

	describe("unknown identifiers", () => {
		it("throws on unknown identifier", () => {
			expect(() => parseAndCheck("unknownVar")).toThrow(UnknownIdentifierException);
		});
	});

	describe("unary expressions", () => {
		it("throws on NOT with non-boolean operand", () => {
			expect(() => parseAndCheck("NON x")).toThrow(InvalidUnaryExprOperandTypeException);
		});
	});

	describe("arithmetic expressions", () => {
		it("throws on arithmetic with non-number left operand", () => {
			expect(() => parseAndCheck("flag + 5")).toThrow(InvalidBinaryExprOperandTypeException);
		});

		it("throws on arithmetic with non-number right operand", () => {
			expect(() => parseAndCheck("5 + flag")).toThrow(InvalidBinaryExprOperandTypeException);
		});

		it("throws on arithmetic with both non-number operands", () => {
			expect(() => parseAndCheck("flag + VRAI")).toThrow(InvalidBinaryExprOperandTypeException);
		});
	});

	describe("comparison expressions", () => {
		it("throws on incompatible types", () => {
			expect(() => parseAndCheck("x = flag")).toThrow(IncompatibleOperandsTypesException);
		});

		it("throws on non-number with ordered comparison", () => {
			expect(() => parseAndCheck("flag < VRAI")).toThrow(InvalidBinaryExprOperandTypeException);
		});

		it("accepts equality/inequality with same types", () => {
			expect(() => parseAndCheck("flag = VRAI")).not.toThrow();
			expect(() => parseAndCheck("flag != FAUX")).not.toThrow();
		});
	});

	describe("logical expressions", () => {
		it("throws on AND with non-boolean left operand", () => {
			expect(() => parseAndCheck("x ET VRAI")).toThrow(InvalidBinaryExprOperandTypeException);
		});

		it("throws on AND with non-boolean right operand", () => {
			expect(() => parseAndCheck("VRAI ET x")).toThrow(InvalidBinaryExprOperandTypeException);
		});

		it("throws on OR with non-boolean operands", () => {
			expect(() => parseAndCheck("x OU y")).toThrow(InvalidBinaryExprOperandTypeException);
		});
	});

	describe("assignment statements", () => {
		it("throws on non-identifier target", () => {
			const tokens = lexer.tokenize("5 := x");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			expect(() => analyser.visit(ast)).toThrow(InvalidAssignmentTargetException);
		});

		it("throws on input variable assignment", () => {
			expect(() => parseAndCheck("x := 10")).toThrow(InputIdentifierAssignmentException);
			expect(() => parseAndCheck("flag := VRAI")).toThrow(InputIdentifierAssignmentException);
		});

		it("throws on type mismatch in assignment", () => {
			expect(() => parseAndCheck("result := VRAI")).toThrow(IncompatibleOperandsTypesException);
			expect(() => parseAndCheck("boolResult := 42")).toThrow(IncompatibleOperandsTypesException);
		});

		it("accepts assignment to OUT and INOUT variables", () => {
			expect(() => parseAndCheck("result := 42")).not.toThrow();
			expect(() => parseAndCheck("y := 100")).not.toThrow();
		});
	});

	describe("unauthorized nodes", () => {
		it("throws on unauthorized node type", () => {
			const restrictedAnalyser = new SemanticAnalyserVisitor(env, {
				unauthorizedNodes: ["NUMBER_LITERAL"],
			});
			const tokens = lexer.tokenize("42");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			expect(() => restrictedAnalyser.visit(ast)).toThrow(UnauthorizedNodeException);
		});
	});

	describe("timer string declarations", () => {
		it("throws on non-boolean timer input", () => {
			expect(() => parseAndCheck("t1/x/5s")).toThrow();
		});

		it("accepts boolean timer input", () => {
			expect(() => parseAndCheck("timer1/flag/5s")).not.toThrow();
		});
	});

	describe("complex expressions", () => {
		it("validates nested expressions", () => {
			expect(() => parseAndCheck("result := (x + 5) * 2")).not.toThrow();
		});

		it("catches errors in nested expressions", () => {
			expect(() => parseAndCheck("result := (flag + 5) * 2")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});
	});
});
