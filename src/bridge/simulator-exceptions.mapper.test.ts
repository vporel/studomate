import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import InvalidCharacterException from "@/expression-language/lexer/exceptions/invalid-character.exception";
import InvalidStringEndQuoteException from "@/expression-language/lexer/exceptions/invalid-string-end-quote.exception";
import UnterminatedStringException from "@/expression-language/lexer/exceptions/unterminated-string.exception";
import BadTokenTypeException from "@/expression-language/parser/exceptions/bad-token-type.exception";
import MissingPrimaryOrLeftParentheseException from "@/expression-language/parser/exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "@/expression-language/parser/exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "@/expression-language/parser/exceptions/parsing-ended-before-eof.exception";
import UnknownVariableNameException from "@/simulator/interpreter/environment/exceptions/unknown-variable-name.exception";
import { DivisionByZeroException } from "@/simulator/interpreter/evaluator/exceptions/division-by-zero.exception";
import IncompatibleOperandsTypesException from "@/simulator/interpreter/semantic-analyser/exceptions/incompatible-operands-types.exception";
import InputIdentifierAssignmentException from "@/simulator/interpreter/semantic-analyser/exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-assignment-target.exception";
import InvalidBinaryExprOperandTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-binary-expr-operand-type.exception";
import InvalidTimerElapsedTimeTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-elapsed-time-type.exception";
import InvalidTimerInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-input-type.exception";
import InvalidTimerLastInputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-last-input-node.exception";
import InvalidTimerLastInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-last-input-type.exception";
import InvalidTimerOutputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-output-node.exception";
import InvalidTimerOutputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-output-type.exception";
import InvalidTimerPresetTimeTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-preset-time-type.exception";
import InvalidUnaryExprOperandTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-unary-expr-operand-type.exception";
import UnauthorizedNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/unauthorized-node.exception";
import UnknownIdentifierException from "@/simulator/interpreter/semantic-analyser/exceptions/unknown-identifier.exception";
import SimulatorExceptionsMapper from "./simulator-exceptions.mapper";

function timerNode(): TimerNode {
	return BlocksBuilder.buildTimerNode(
		"TON",
		LiteralsBuilder.buildBooleanNode(true, 0),
		IdentifiersBuilder.buildIdentifierNode("lastInput", 0),
		LiteralsBuilder.buildNumberNode(1000, 0),
		IdentifiersBuilder.buildIdentifierNode("elapsed", 0),
		IdentifiersBuilder.buildIdentifierNode("output", 0),
	);
}

describe("SimulatorExceptionsMapper", () => {
	describe("environment exceptions", () => {
		it("maps UnknownVariableNameException", () => {
			const e = new UnknownVariableNameException("Foo");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe("Variable inconnue : Foo");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toBe("Unknown variable name: Foo");
		});
	});

	describe("semantic exceptions", () => {
		it("maps UnauthorizedNodeException", () => {
			const node = LiteralsBuilder.buildNumberNode(1, 0);
			const e = new UnauthorizedNodeException("NUMBER_LITERAL", node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain("Nœud non autorisé");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toContain("Unauthorized node");
		});

		it("maps UnknownIdentifierException", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("Bar", 0);
			const e = new UnknownIdentifierException(node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe("Variable inconnue : Bar");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toBe("Unknown variable: Bar");
		});

		it("maps InvalidUnaryExprOperandTypeException, translating the operator to French", () => {
			const node = ExpressionsBuilder.buildUnaryExpressionNode(
				"NOT",
				LiteralsBuilder.buildNumberNode(1, 0),
				0,
			);
			const e = new InvalidUnaryExprOperandTypeException("NOT", "boolean", "number", node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Type invalide pour l'opérateur 'NON' : attendu booléen, obtenu nombre",
			);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toBe(
				"Invalid type for operator 'NOT': expected boolean, got number",
			);
		});

		it("maps InvalidBinaryExprOperandTypeException, naming the offending side in French", () => {
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				"=",
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildBooleanNode(true, 0),
				0,
			) as any;
			const e = new InvalidBinaryExprOperandTypeException("=", "right", "number", "boolean", node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Type invalide pour l'opérateur '=' côté droite : attendu nombre, obtenu booléen",
			);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toBe(
				"Invalid type for operator '=' on the right side: expected number, got boolean",
			);
		});

		it("maps InvalidAssignmentTargetException", () => {
			const node = StatementsBuilder.buildAssignStatementNode(
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildNumberNode(2, 0),
				0,
			);
			const e = new InvalidAssignmentTargetException(node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Cible d'affectation invalide : la partie gauche doit être une variable.",
			);
		});

		it("maps InputIdentifierAssignmentException", () => {
			const node = StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode("In1", 0),
				LiteralsBuilder.buildNumberNode(2, 0),
				0,
			);
			const e = new InputIdentifierAssignmentException(node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Affectation invalide : la variable affectée est une variable d'entrée.",
			);
		});

		it("maps IncompatibleOperandsTypesException", () => {
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				"=",
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildStringNode("x", 0),
				0,
			);
			const e = new IncompatibleOperandsTypesException("=", "number", "string", node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Types incompatibles pour l'opérateur '=' : gauche nombre, droite chaîne de caractères",
			);
		});

		describe("timer-related exceptions", () => {
			it("maps InvalidTimerInputTypeException", () => {
				const e = new InvalidTimerInputTypeException("number", timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"l'entrée d'une temporisation doit être un booléen",
				);
			});

			it("maps InvalidTimerLastInputNodeException", () => {
				const e = new InvalidTimerLastInputNodeException(timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"la dernière valeur d'entrée d'un bloc de temporisation doit être une variable",
				);
			});

			it("maps InvalidTimerLastInputTypeException", () => {
				const e = new InvalidTimerLastInputTypeException("number", timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"doit être un booléen (trouvé nombre)",
				);
			});

			it("maps InvalidTimerOutputNodeException", () => {
				const e = new InvalidTimerOutputNodeException(timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"la sortie d'un bloc de temporisation doit être une variable",
				);
			});

			it("maps InvalidTimerOutputTypeException", () => {
				const e = new InvalidTimerOutputTypeException("string", timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"doit retourner un booléen (trouvé chaîne de caractères)",
				);
			});

			it("maps InvalidTimerPresetTimeTypeException", () => {
				const e = new InvalidTimerPresetTimeTypeException("boolean", timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"attendu nombre, obtenu booléen",
				);
			});

			it("maps InvalidTimerElapsedTimeTypeException", () => {
				const e = new InvalidTimerElapsedTimeTypeException("string", timerNode());
				expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
					"attendu nombre, obtenu chaîne de caractères",
				);
			});
		});
	});

	describe("interpreter exceptions", () => {
		it("maps DivisionByZeroException", () => {
			const node = LiteralsBuilder.buildNumberNode(1, 0);
			const e = new DivisionByZeroException(10, 0, node);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe("Division par zéro : 10 / 0");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toBe("Division by zero: 10 / 0");
		});
	});

	describe("parser exceptions", () => {
		it("maps ParsingEndedBeforeEOFException", () => {
			const e = new ParsingEndedBeforeEOFException({ type: "EOF", position: 5 } as any);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
				"caractère inattendu à la position",
			);
		});

		it("maps MissingPrimaryOrLeftParentheseException", () => {
			const e = new MissingPrimaryOrLeftParentheseException({ type: "PLUS", position: 3 } as any);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
				"Expression attendue (variable, nombre, chaîne) ou '(' à la position",
			);
		});

		it("maps MissingRightParentheseException", () => {
			const e = new MissingRightParentheseException(7, false);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Parenthèse fermante manquante à la position 7",
			);
		});

		it("maps BadTokenTypeException", () => {
			const e = new BadTokenTypeException(["PLUS", "MINUS"] as any, "STAR" as any, 4);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
				"Jeton inattendu à la position 4",
			);
		});
	});

	describe("lexer exceptions", () => {
		it("maps InvalidCharacterException", () => {
			const e = new InvalidCharacterException("$", 2);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Caractère inattendu '$' à la position 2",
			);
		});

		it("maps InvalidStringEndQuoteException", () => {
			const e = new InvalidStringEndQuoteException('"', 6);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain(
				"Guillemet de fin invalide",
			);
		});

		it("maps UnterminatedStringException", () => {
			const e = new UnterminatedStringException('"', 8);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toContain("Chaîne non terminée");
		});
	});

	describe("fallback behaviour", () => {
		it("falls back to the raw message of a generic Error", () => {
			const e = new Error("boom");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe("boom");
		});

		it("falls back to a generic message when a generic Error has no message", () => {
			const e = new Error("");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR")).toBe(
				"Expression invalide : erreur inconnue",
			);
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e, "EN")).toBe(
				"Invalid expression: unknown error",
			);
		});

		it("stringifies a thrown value that isn't an Error", () => {
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage("plain string", "FR")).toBe("plain string");
		});

		it("defaults to French when no language is given", () => {
			const e = new UnknownVariableNameException("Foo");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e)).toBe("Variable inconnue : Foo");
		});
	});
});
