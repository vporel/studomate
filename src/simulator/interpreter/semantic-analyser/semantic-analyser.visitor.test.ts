import EnvVariable from "../environment/env-variable";
import { Environment } from "../environment/environment";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import InvalidTimerElapsedTimeNodeException from "./exceptions/invalid-timer-elapsed-time-node.exception";
import InvalidTimerLastInputTypeException from "./exceptions/invalid-timer-last-input-type.exception";
import InvalidCounterControlTypeException from "./exceptions/invalid-counter-control-type.exception";
import InvalidCounterInputTypeException from "./exceptions/invalid-counter-input-type.exception";
import InvalidCounterOutputTypeException from "./exceptions/invalid-counter-output-type.exception";
import InvalidCounterLastInputNodeException from "./exceptions/invalid-counter-last-input-node.exception";
import InvalidCounterLastInputTypeException from "./exceptions/invalid-counter-last-input-type.exception";
import IncompatibleOperandsTypesException from "./exceptions/incompatible-operands-types.exception";
import AssignmentToSystemVariableException from "./exceptions/assignment-to-system-variable.exception";
import InputIdentifierAssignmentException from "./exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "./exceptions/invalid-assignment-target.exception";
import InvalidBinaryExprOperandTypeException from "./exceptions/invalid-binary-expr-operand-type.exception";
import InvalidUnaryExprOperandTypeException from "./exceptions/invalid-unary-expr-operand-type.exception";
import UnauthorizedNodeException from "./exceptions/unauthorized-node.exception";
import UnknownIdentifierException from "./exceptions/unknown-identifier.exception";
import SemanticAnalyserVisitor from "./semantic-analyser.visitor";
import BitStringArithmeticException from "./exceptions/bit-string-arithmetic.exception";
import ConstantOutOfRangeException from "./exceptions/constant-out-of-range.exception";
import ExplicitConversionRequiredException from "./exceptions/explicit-conversion-required.exception";
import IncompatibleNumericTypesException from "./exceptions/incompatible-numeric-types.exception";
import InvalidConversionArgumentException from "./exceptions/invalid-conversion-argument.exception";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import { ConvertibleType } from "@/expression-language/conversions";
import {
	getNumericRange,
	VARIABLE_TYPE_TO_NATIVE_TYPE,
	VariableType,
} from "@/schemas/variable/variable.schema";

describe("SemanticAnalyserVisitor", () => {
	let env: Environment;
	let analyser: SemanticAnalyserVisitor;
	let lexer: Lexer;

	beforeEach(() => {
		const varX = new EnvVariable("id1", "x", "number", "IN");
		const varY = new EnvVariable("id2", "y", "number", "INOUT");
		const varFlag = new EnvVariable("id3", "flag", "boolean", "IN");
		const varResult = new EnvVariable("id4", "result", "number", "OUT");
		const varBoolResult = new EnvVariable(
			"id5",
			"boolResult",
			"boolean",
			"OUT",
		);
		const varSystemTimeBase = new EnvVariable(
			"_SYS_TB_200ms",
			"_SYS_TB_200ms",
			"boolean",
			"IN",
		);
		env = new Environment([
			varX,
			varY,
			varFlag,
			varResult,
			varBoolResult,
			varSystemTimeBase,
		]);
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

		it("accepts a system variable read in an expression", () => {
			expect(() => parseAndCheck("flag ET _SYS_TB_200ms")).not.toThrow();
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
			expect(() => parseAndCheck("unknownVar")).toThrow(
				UnknownIdentifierException,
			);
		});
	});

	describe("unary expressions", () => {
		it("throws on NOT with non-boolean operand", () => {
			expect(() => parseAndCheck("NON x")).toThrow(
				InvalidUnaryExprOperandTypeException,
			);
		});

		it("accepts valid unary minus", () => {
			expect(() => parseAndCheck("-x")).not.toThrow();
			expect(() => parseAndCheck("-5")).not.toThrow();
		});

		it("throws on unary minus with non-number operand", () => {
			expect(() => parseAndCheck("-flag")).toThrow(
				InvalidUnaryExprOperandTypeException,
			);
		});
	});

	describe("arithmetic expressions", () => {
		it("throws on arithmetic with non-number left operand", () => {
			expect(() => parseAndCheck("flag + 5")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});

		it("throws on arithmetic with non-number right operand", () => {
			expect(() => parseAndCheck("5 + flag")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});

		it("throws on arithmetic with both non-number operands", () => {
			expect(() => parseAndCheck("flag + VRAI")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});
	});

	describe("comparison expressions", () => {
		it("throws on incompatible types", () => {
			expect(() => parseAndCheck("x = flag")).toThrow(
				IncompatibleOperandsTypesException,
			);
		});

		it("throws on non-number with ordered comparison", () => {
			expect(() => parseAndCheck("flag < VRAI")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});

		it("accepts equality/inequality with same types", () => {
			expect(() => parseAndCheck("flag = VRAI")).not.toThrow();
			expect(() => parseAndCheck("flag != FAUX")).not.toThrow();
		});
	});

	describe("logical expressions", () => {
		it("throws on AND with non-boolean left operand", () => {
			expect(() => parseAndCheck("x ET VRAI")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});

		it("throws on AND with non-boolean right operand", () => {
			expect(() => parseAndCheck("VRAI ET x")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});

		it("throws on OR with non-boolean operands", () => {
			expect(() => parseAndCheck("x OU y")).toThrow(
				InvalidBinaryExprOperandTypeException,
			);
		});
	});

	describe("assignment statements", () => {
		it("throws on non-identifier target", () => {
			const tokens = lexer.tokenize("5 := x");
			const parser = new Parser(tokens);
			const ast = parser.parse();
			expect(() => analyser.visit(ast)).toThrow(
				InvalidAssignmentTargetException,
			);
		});

		it("throws on input variable assignment", () => {
			expect(() => parseAndCheck("x := 10")).toThrow(
				InputIdentifierAssignmentException,
			);
			expect(() => parseAndCheck("flag := VRAI")).toThrow(
				InputIdentifierAssignmentException,
			);
		});

		it("throws on type mismatch in assignment", () => {
			expect(() => parseAndCheck("result := VRAI")).toThrow(
				IncompatibleOperandsTypesException,
			);
			expect(() => parseAndCheck("boolResult := 42")).toThrow(
				IncompatibleOperandsTypesException,
			);
		});

		it("accepts assignment to OUT and INOUT variables", () => {
			expect(() => parseAndCheck("result := 42")).not.toThrow();
			expect(() => parseAndCheck("y := 100")).not.toThrow();
		});

		it("throws AssignmentToSystemVariableException on a _SYS_ target", () => {
			expect(() => parseAndCheck("_SYS_TB_200ms := VRAI")).toThrow(
				AssignmentToSystemVariableException,
			);
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
			expect(() => restrictedAnalyser.visit(ast)).toThrow(
				UnauthorizedNodeException,
			);
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

	describe("timer block nodes", () => {
		function buildTimerNode(
			elapsedTime: ASTNode = IdentifiersBuilder.buildIdentifierNode("result"),
		) {
			return BlocksBuilder.buildTimerNode(
				"TON",
				IdentifiersBuilder.buildIdentifierNode("flag"),
				IdentifiersBuilder.buildIdentifierNode("flag"),
				IdentifiersBuilder.buildIdentifierNode("x"),
				elapsedTime,
				IdentifiersBuilder.buildIdentifierNode("boolResult"),
			);
		}

		it("accepts an identifier for elapsedTime", () => {
			expect(() => analyser.visit(buildTimerNode())).not.toThrow();
		});

		it("throws InvalidTimerElapsedTimeNodeException when elapsedTime is not an identifier", () => {
			const node = buildTimerNode(LiteralsBuilder.buildNumberNode(5));
			expect(() => analyser.visit(node)).toThrow(
				InvalidTimerElapsedTimeNodeException,
			);
		});

		it("InvalidTimerLastInputTypeException désigne lastInput comme nœud invalide", () => {
			const lastInput = IdentifiersBuilder.buildIdentifierNode("x");
			const node = BlocksBuilder.buildTimerNode(
				"TON",
				IdentifiersBuilder.buildIdentifierNode("flag"),
				lastInput,
				IdentifiersBuilder.buildIdentifierNode("x"),
				IdentifiersBuilder.buildIdentifierNode("result"),
				IdentifiersBuilder.buildIdentifierNode("boolResult"),
			);

			let caught: unknown;
			try {
				analyser.visit(node);
			} catch (e) {
				caught = e;
			}

			expect(caught).toBeInstanceOf(InvalidTimerLastInputTypeException);
			expect(
				(caught as InvalidTimerLastInputTypeException).getInvalidNodes(),
			).toEqual([lastInput]);
		});
	});

	describe("counter block nodes", () => {
		function buildCounterNode(
			lastInput: ASTNode = IdentifiersBuilder.buildIdentifierNode("flag"),
		) {
			return BlocksBuilder.buildCounterNode(
				"CTU",
				IdentifiersBuilder.buildIdentifierNode("flag"),
				lastInput,
				IdentifiersBuilder.buildIdentifierNode("flag"),
				IdentifiersBuilder.buildIdentifierNode("x"),
				IdentifiersBuilder.buildIdentifierNode("y"),
				IdentifiersBuilder.buildIdentifierNode("boolResult"),
			);
		}

		it("accepts a boolean identifier for lastInput", () => {
			expect(() => analyser.visit(buildCounterNode())).not.toThrow();
		});

		it("throws InvalidCounterLastInputNodeException when lastInput is not an identifier", () => {
			const node = buildCounterNode(LiteralsBuilder.buildBooleanNode(false));
			expect(() => analyser.visit(node)).toThrow(
				InvalidCounterLastInputNodeException,
			);
		});

		it("throws InvalidCounterLastInputTypeException when lastInput is not boolean, pointing at lastInput", () => {
			const lastInput = IdentifiersBuilder.buildIdentifierNode("x");
			const node = buildCounterNode(lastInput);

			let caught: unknown;
			try {
				analyser.visit(node);
			} catch (e) {
				caught = e;
			}

			expect(caught).toBeInstanceOf(InvalidCounterLastInputTypeException);
			expect(
				(caught as InvalidCounterLastInputTypeException).getInvalidNodes(),
			).toEqual([lastInput]);
		});
	});

	describe("CTUD counter block nodes", () => {
		const buildCtud = (down: {
			input?: string;
			lastInput?: ASTNode;
			load?: string;
			output?: ASTNode;
		}) =>
			BlocksBuilder.buildCounterNode(
				"CTUD",
				IdentifiersBuilder.buildIdentifierNode("flag"),
				IdentifiersBuilder.buildIdentifierNode("flag"),
				IdentifiersBuilder.buildIdentifierNode("flag"),
				IdentifiersBuilder.buildIdentifierNode("x"),
				IdentifiersBuilder.buildIdentifierNode("y"),
				IdentifiersBuilder.buildIdentifierNode("boolResult"),
				{
					input: IdentifiersBuilder.buildIdentifierNode(down.input ?? "flag"),
					lastInput:
						down.lastInput ?? IdentifiersBuilder.buildIdentifierNode("flag"),
					load: IdentifiersBuilder.buildIdentifierNode(down.load ?? "flag"),
					output:
						down.output ??
						IdentifiersBuilder.buildIdentifierNode("boolResult"),
				},
			);

		it("accepts a valid down part", () => {
			expect(() => analyser.visit(buildCtud({}))).not.toThrow();
		});

		it("validates the types of the down part", () => {
			expect(() => analyser.visit(buildCtud({ input: "x" }))).toThrow(
				InvalidCounterInputTypeException,
			);
			expect(() => analyser.visit(buildCtud({ load: "x" }))).toThrow(
				InvalidCounterControlTypeException,
			);
			expect(() =>
				analyser.visit(
					buildCtud({ lastInput: LiteralsBuilder.buildBooleanNode(false) }),
				),
			).toThrow(InvalidCounterLastInputNodeException);
			expect(() =>
				analyser.visit(
					buildCtud({ output: IdentifiersBuilder.buildIdentifierNode("x") }),
				),
			).toThrow(InvalidCounterOutputTypeException);
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

describe("SemanticAnalyserVisitor : typage IEC 61131-3", () => {
	const typed = (name: string, type: VariableType) =>
		new EnvVariable(
			name,
			name,
			VARIABLE_TYPE_TO_NATIVE_TYPE[type],
			"INOUT",
			getNumericRange(type),
			type,
		);
	const env = new Environment([
		typed("i", "INT"),
		typed("i2", "INT"),
		typed("d", "DINT"),
		typed("r", "REAL"),
		typed("w", "WORD"),
		typed("dw", "DWORD"),
		typed("t", "TIME"),
		typed("b", "BOOL"),
		new EnvVariable("u", "u", "number", "INOUT"),
	]);
	const analyse = (expression: string) =>
		new SemanticAnalyserVisitor(env).visit(
			new Parser(new Lexer(Dialect.FR).tokenize(expression)).parse(),
		);

	describe("opérations arithmétiques", () => {
		it("accepte des opérandes de même type, un élargissement ou une constante qui tient", () => {
			expect(() => analyse("i := i * 100")).not.toThrow();
			expect(() => analyse("d := i + d")).not.toThrow();
			expect(() => analyse("r := i * r")).not.toThrow();
			expect(() => analyse("r := r * 2.5")).not.toThrow();
		});

		it("refuse DINT avec REAL sans conversion", () => {
			expect(() => analyse("r := d * r")).toThrow(IncompatibleNumericTypesException);
		});

		it("refuse une constante réelle avec un entier", () => {
			expect(() => analyse("r := i * 2.5")).toThrow(
				IncompatibleNumericTypesException,
			);
		});

		it("refuse une constante hors de la plage du type de l'autre opérande", () => {
			expect(() => analyse("i := i + 40000")).toThrow(ConstantOutOfRangeException);
		});

		it("refuse l'arithmétique sur une chaîne de bits, y compris la négation", () => {
			expect(() => analyse("w := w + 1")).toThrow(BitStringArithmeticException);
			expect(() => analyse("b := -w = 0")).toThrow(BitStringArithmeticException);
		});

		it("TIME : additionne deux durées, multiplie une durée par un nombre", () => {
			expect(() => analyse("t := t + T#1s")).not.toThrow();
			expect(() => analyse("t := t * 2")).not.toThrow();
			expect(() => analyse("t := t + 1000")).toThrow(
				IncompatibleNumericTypesException,
			);
		});

		it("une variable sans type déclaré échappe aux règles", () => {
			expect(() => analyse("u := u + w * 2.5")).toThrow(
				BitStringArithmeticException,
			);
			expect(() => analyse("u := u * 2.5 + d")).not.toThrow();
		});
	});

	describe("comparaisons", () => {
		it("compare des types compatibles, chaînes de bits comprises", () => {
			expect(() => analyse("b := i < d")).not.toThrow();
			expect(() => analyse("b := w = 0")).not.toThrow();
			expect(() => analyse("b := t > T#2s")).not.toThrow();
		});

		it("refuse des types incompatibles", () => {
			expect(() => analyse("b := i = w")).toThrow(IncompatibleNumericTypesException);
			expect(() => analyse("b := d < r")).toThrow(IncompatibleNumericTypesException);
			expect(() => analyse("b := t > 2000")).toThrow(
				IncompatibleNumericTypesException,
			);
		});
	});

	describe("affectations", () => {
		it("accepte le même type ou un élargissement", () => {
			expect(() => analyse("d := i")).not.toThrow();
			expect(() => analyse("r := i")).not.toThrow();
			expect(() => analyse("dw := w")).not.toThrow();
			expect(() => analyse("w := 255")).not.toThrow();
		});

		it("exige une conversion explicite pour rétrécir", () => {
			expect(() => analyse("i := d")).toThrow(ExplicitConversionRequiredException);
			expect(() => analyse("i := r")).toThrow(ExplicitConversionRequiredException);
			expect(() => analyse("r := d")).toThrow(ExplicitConversionRequiredException);
			expect(() => analyse("i := w")).toThrow(ExplicitConversionRequiredException);
		});

		it("évalue le type d'une expression, pas seulement celui des variables", () => {
			expect(() => analyse("i := i * d")).toThrow(ExplicitConversionRequiredException);
		});

		it("refuse une constante hors plage, y compris repliée", () => {
			expect(() => analyse("i := 40000")).toThrow(ConstantOutOfRangeException);
			expect(() => analyse("i := 30000 + 30000")).toThrow(
				ConstantOutOfRangeException,
			);
			expect(() => analyse("w := -1")).toThrow(ConstantOutOfRangeException);
		});

		it("refuse une constante réelle dans un entier", () => {
			expect(() => analyse("i := 2.5")).toThrow(ExplicitConversionRequiredException);
		});
	});

	describe("fonctions de conversion", () => {
		it("accepte un argument du type source ou d'un type qui s'y élargit", () => {
			expect(() => analyse("i := DINT_TO_INT(d)")).not.toThrow();
			expect(() => analyse("i := DINT_TO_INT(i * 100)")).not.toThrow();
			expect(() => analyse("i := REAL_TO_INT(r * 2.5)")).not.toThrow();
			expect(() => analyse("i := WORD_TO_INT(w)")).not.toThrow();
		});

		it("refuse un argument d'un autre type", () => {
			expect(() => analyse("i := DINT_TO_INT(r)")).toThrow(
				InvalidConversionArgumentException,
			);
			expect(() => analyse("i := INT_TO_DINT(b)")).toThrow(
				InvalidConversionArgumentException,
			);
		});

		it("le résultat a le type cible", () => {
			expect(() => analyse("r := DINT_TO_REAL(d) * r")).not.toThrow();
			expect(() => analyse("i := INT_TO_DINT(i)")).toThrow(
				ExplicitConversionRequiredException,
			);
		});

		it("sans type source, le type de l'opérande doit être convertible vers la cible", () => {
			const conversion = (source: string, target: ConvertibleType) =>
				new SemanticAnalyserVisitor(env).visit(
					ExpressionsBuilder.buildConversionExpressionNode(
						null,
						target,
						IdentifiersBuilder.buildIdentifierNode(source),
					),
				);
			expect(() => conversion("d", "INT")).not.toThrow();
			expect(() => conversion("r", "WORD")).toThrow(
				InvalidConversionArgumentException,
			);
			expect(() => conversion("i", "INT")).toThrow(
				InvalidConversionArgumentException,
			);
			expect(() => conversion("t", "DINT")).toThrow(
				InvalidConversionArgumentException,
			);
		});
	});
});
