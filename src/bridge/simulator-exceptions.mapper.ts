import IncompatibleOperandsTypesException from "@/simulator/interpreter/semantic-analyser/exceptions/incompatible-operands-types.exception";
import InputIdentifierAssignmentException from "@/simulator/interpreter/semantic-analyser/exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-assignment-target.exception";
import UnknownIdentifierException from "@/simulator/interpreter/semantic-analyser/exceptions/unknown-identifier.exception";

import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";

import { NATIVE_TYPE_LABELS } from "@/schemas/variable/variable.schema";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import UnknownVariableNameException from "@/simulator/interpreter/environment/exceptions/unknown-variable-name.exception";
import InvalidCounterControlTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-control-type.exception";
import InvalidCounterCurrentValueNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-current-value-node.exception";
import InvalidCounterCurrentValueTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-current-value-type.exception";
import InvalidCounterInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-input-type.exception";
import InvalidCounterOutputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-output-node.exception";
import InvalidCounterOutputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-output-type.exception";
import InvalidCounterPresetValueTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-preset-value-type.exception";
import InvalidTimerElapsedTimeTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-elapsed-time-type.exception";
import InvalidTimerInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-input-type.exception";
import InvalidTimerLastInputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-last-input-node.exception";
import InvalidTimerLastInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-last-input-type.exception";
import InvalidTimerOutputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-output-node.exception";
import InvalidTimerOutputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-output-type.exception";
import InvalidTimerPresetTimeTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-preset-time-type.exception";
import UnauthorizedNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/unauthorized-node.exception";
import InvalidCharacterException from "@/expression-language/lexer/exceptions/invalid-character.exception";
import InvalidKeywordException from "@/expression-language/lexer/exceptions/invalid-keyword.exception";
import UnterminatedStringException from "@/expression-language/lexer/exceptions/unterminated-string.exception";
import BadTokenTypeException from "@/expression-language/parser/exceptions/bad-token-type.exception";
import MissingPrimaryOrLeftParentheseException from "@/expression-language/parser/exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "@/expression-language/parser/exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "@/expression-language/parser/exceptions/parsing-ended-before-eof.exception";
import InvalidBinaryExprOperandTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-binary-expr-operand-type.exception";
import InvalidUnaryExprOperandTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-unary-expr-operand-type.exception";

type Lang = "FR" | "EN";

const AST_NODE_TYPE_LABELS: Record<ASTNode["type"], string> = {
	IDENTIFIER: "Variable",
	BOOLEAN_LITERAL: "Booléen",
	NUMBER_LITERAL: "Nombre",
	STRING_LITERAL: "Chaîne de caractères",
	UNARY_EXPRESSION: "Expression unaire",
	COMPARISON_EXPRESSION: "Expression de comparaison",
	LOGICAL_EXPRESSION: "Expression logique",
	ARITHMETIC_EXPRESSION: "Expression arithmétique",
	ASSIGN_STATEMENT: "Affectation",
	TIMER_BLOCK: "Bloc de temporisation",
	TIMER_STRING_DECLARATION: "Temporisation",
	COUNTER_BLOCK: "Bloc compteur",
	IF_CONTROL: "Contrôle conditionnel",
};

export default class SimulatorExceptionsMapper {
	/**
	 * Returns user-friendly error messages for exceptions thrown by the compiler modules.
	 */
	static getUserFriendlyMessage(exception: unknown, lang: Lang = "FR"): string {
		const handlers = [
			this.getForEnvironmentException,
			this.getForSemanticException,
			this.getForInterpreterException,
			this.getForParserException,
			this.getForLexerException,
		];

		for (const h of handlers) {
			const msg = h.call(this, exception, lang);
			if (msg) return msg;
		}

		if (exception instanceof Error) {
			return (
				exception.message ||
				(lang === "EN"
					? "Invalid expression: unknown error"
					: "Expression invalide : erreur inconnue")
			);
		}
		return String(exception);
	}

	private static transformVariableType(type: string, lang: Lang): string {
		if (lang === "EN") return type;
		return NATIVE_TYPE_LABELS[type as keyof typeof NATIVE_TYPE_LABELS] ?? type;
	}

	private static transformOperator(op: string, lang: Lang): string {
		if (lang === "EN") return op;
		switch (op.toUpperCase()) {
			case "AND":
				return "ET";
			case "OR":
				return "OU";
			case "NOT":
				return "NON";
			default:
				return op;
		}
	}

	private static getForEnvironmentException(exception: unknown, lang: Lang): string | null {
		if (exception instanceof UnknownVariableNameException) {
			return lang === "EN"
				? `Unknown variable name: ${exception.getVariableName()}`
				: `Variable inconnue : ${exception.getVariableName()}`;
		}
		return null;
	}

	private static getForSemanticException(exception: unknown, lang: Lang): string | null {
		if (exception instanceof UnauthorizedNodeException) {
			return lang === "EN"
				? `Unauthorized node of type: ${AST_NODE_TYPE_LABELS[exception.getNodeType()]}`
				: `Nœud non autorisé de type : ${exception.getNodeType()}`;
		}

		if (exception instanceof UnknownIdentifierException) {
			return lang === "EN"
				? `Unknown variable: ${exception.getIdentifier()}`
				: `Variable inconnue : ${exception.getIdentifier()}`;
		}

		if (exception instanceof InvalidUnaryExprOperandTypeException) {
			const op = SimulatorExceptionsMapper.transformOperator(exception.getOperator(), lang);
			const expected = SimulatorExceptionsMapper.transformVariableType(
				exception.getExpectedType(),
				lang,
			);
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid type for operator '${op}': expected ${expected}, got ${actual}`
				: `Type invalide pour l'opérateur '${op}' : attendu ${expected}, obtenu ${actual}`;
		}

		if (exception instanceof InvalidBinaryExprOperandTypeException) {
			const op = SimulatorExceptionsMapper.transformOperator(exception.getOperator(), lang);
			const side = exception.getSide();
			const expected = SimulatorExceptionsMapper.transformVariableType(
				exception.getExpectedType(),
				lang,
			);
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			if (lang === "EN") {
				return `Invalid type for operator '${op}' on the ${side} side: expected ${expected}, got ${actual}`;
			}
			const sideFr = side === "left" ? "gauche" : "droite";
			return `Type invalide pour l'opérateur '${op}' côté ${sideFr} : attendu ${expected}, obtenu ${actual}`;
		}

		if (exception instanceof InvalidAssignmentTargetException) {
			return lang === "EN"
				? "Invalid assignment target: left-hand side must be a variable."
				: "Cible d'affectation invalide : la partie gauche doit être une variable.";
		}

		if (exception instanceof InputIdentifierAssignmentException) {
			return lang === "EN"
				? "Invalid assignment: the assigned variable is an input variable."
				: "Affectation invalide : la variable affectée est une variable d'entrée.";
		}

		if (exception instanceof IncompatibleOperandsTypesException) {
			const op = SimulatorExceptionsMapper.transformOperator(exception.getOperator(), lang);
			const leftType = SimulatorExceptionsMapper.transformVariableType(exception.getLeftType(), lang);
			const rightType = SimulatorExceptionsMapper.transformVariableType(exception.getRightType(), lang);
			return lang === "EN"
				? `Incompatible types for operator '${op}': left ${leftType}, right ${rightType}`
				: `Types incompatibles pour l'opérateur '${op}' : gauche ${leftType}, droite ${rightType}`;
		}

		if (exception instanceof InvalidTimerInputTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid timer input type: the input of a timer must be boolean (found ${actual})`
				: `Type d'entrée de temporisation invalide : l'entrée d'une temporisation doit être un booléen (trouvé ${actual})`;
		}

		if (exception instanceof InvalidTimerLastInputNodeException) {
			return lang === "EN"
				? `Invalid timer last input node: the last input of a timer block must be an identifier`
				: `Nœud de dernière valeur d'entrée de temporisation invalide : la dernière valeur d'entrée d'un bloc de temporisation doit être une variable`;
		}

		if (exception instanceof InvalidTimerLastInputTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid timer last input type: the last input of a timer block must be boolean (found ${actual})`
				: `Type de dernière valeur d'entrée de temporisation invalide : la dernière valeur d'entrée d'un bloc de temporisation doit être un booléen (trouvé ${actual})`;
		}

		if (exception instanceof InvalidTimerOutputNodeException) {
			return lang === "EN"
				? `Invalid timer output node: the output of a timer block must be an identifier`
				: `Nœud de sortie de temporisation invalide : la sortie d'un bloc de temporisation doit être une variable`;
		}

		if (exception instanceof InvalidTimerOutputTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid timer output type: the output of a timer block must be boolean (found ${actual})`
				: `Type de sortie de temporisation invalide : la sortie d'un bloc de temporisation doit retourner un booléen (trouvé ${actual})`;
		}

		if (exception instanceof InvalidTimerPresetTimeTypeException) {
			const expected = SimulatorExceptionsMapper.transformVariableType(
				exception.getExpectedType(),
				lang,
			);
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid timer preset time type: expected ${expected}, got ${actual}`
				: `Type de temps préréglé de temporisation invalide : attendu ${expected}, obtenu ${actual}`;
		}

		if (exception instanceof InvalidTimerElapsedTimeTypeException) {
			const expected = SimulatorExceptionsMapper.transformVariableType(
				exception.getExpectedType(),
				lang,
			);
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid timer elapsed time type: expected ${expected}, got ${actual}`
				: `Type de temps écoulé de temporisation invalide : attendu ${expected}, obtenu ${actual}`;
		}

		if (exception instanceof InvalidCounterInputTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid counter input type: the input of a counter must be boolean (found ${actual})`
				: `Type d'entrée de compteur invalide : l'entrée d'un compteur doit être un booléen (trouvé ${actual})`;
		}

		if (exception instanceof InvalidCounterControlTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid counter control type: the control (R/LD) of a counter must be boolean (found ${actual})`
				: `Type de contrôle de compteur invalide : le contrôle (R/LD) d'un compteur doit être un booléen (trouvé ${actual})`;
		}

		if (exception instanceof InvalidCounterCurrentValueNodeException) {
			return lang === "EN"
				? `Invalid counter current value node: the current value (CV) of a counter block must be an identifier`
				: `Nœud de valeur courante de compteur invalide : la valeur courante (CV) d'un bloc compteur doit être une variable`;
		}

		if (exception instanceof InvalidCounterCurrentValueTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid counter current value type: the current value (CV) of a counter block must be a number (found ${actual})`
				: `Type de valeur courante de compteur invalide : la valeur courante (CV) d'un bloc compteur doit être numérique (trouvé ${actual})`;
		}

		if (exception instanceof InvalidCounterOutputNodeException) {
			return lang === "EN"
				? `Invalid counter output node: the output of a counter block must be an identifier`
				: `Nœud de sortie de compteur invalide : la sortie d'un bloc compteur doit être une variable`;
		}

		if (exception instanceof InvalidCounterOutputTypeException) {
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid counter output type: the output of a counter block must be boolean (found ${actual})`
				: `Type de sortie de compteur invalide : la sortie d'un bloc compteur doit retourner un booléen (trouvé ${actual})`;
		}

		if (exception instanceof InvalidCounterPresetValueTypeException) {
			const expected = SimulatorExceptionsMapper.transformVariableType(exception.getExpectedType(), lang);
			const actual = SimulatorExceptionsMapper.transformVariableType(exception.getActualType(), lang);
			return lang === "EN"
				? `Invalid counter preset value type: expected ${expected}, got ${actual}`
				: `Type de valeur préréglée de compteur invalide : attendu ${expected}, obtenu ${actual}`;
		}

		return null;
	}

	private static getForInterpreterException(exception: unknown, lang: Lang): string | null {
		if (exception instanceof DivisionByZeroException) {
			return lang === "EN"
				? `Division by zero: ${exception.getLeft()} / ${exception.getRight()}`
				: `Division par zéro : ${exception.getLeft()} / ${exception.getRight()}`;
		}
		return null;
	}

	private static getForParserException(exception: unknown, lang: Lang): string | null {
		if (exception instanceof ParsingEndedBeforeEOFException) {
			const token = (exception as any).getToken();
			const pos = token ? token.position : exception.getPosition?.() || "?";
			return lang === "EN"
				? `Invalid expression: unexpected character at position ${pos}`
				: `Expression invalide : caractère inattendu à la position ${pos}`;
		}

		if (exception instanceof MissingPrimaryOrLeftParentheseException) {
			const token = (exception as any).getToken();
			const pos = token ? token.position : exception.getPosition?.() || "?";
			return lang === "EN"
				? `Expected expression (variable, number, string) or '(' at position ${pos}`
				: `Expression attendue (variable, nombre, chaîne) ou '(' à la position ${pos}`;
		}

		if (exception instanceof MissingRightParentheseException) {
			const pos = exception.getPosition ? exception.getPosition() : "?";
			const end = (exception as any).isEnd ? (exception as any).isEnd() : false;
			return lang === "EN"
				? `Missing closing parenthesis at position ${pos}${end ? " (end of input)" : ""}`
				: `Parenthèse fermante manquante à la position ${pos}${end ? " (fin d'entrée)" : ""}`;
		}

		if (exception instanceof BadTokenTypeException) {
			const expected = exception.getExpected ? exception.getExpected() : [];
			const actual = exception.getActual ? exception.getActual() : null;
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return lang === "EN"
				? `Unexpected token at position ${pos}: expected ${expected.join(", ")}, found ${actual}`
				: `Jeton inattendu à la position ${pos} : attendu ${expected.join(", ")}, trouvé ${actual}`;
		}

		return null;
	}

	private static getForLexerException(exception: unknown, lang: Lang): string | null {
		if (exception instanceof InvalidCharacterException) {
			const char = exception.getChar ? exception.getChar() : "?";
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return lang === "EN"
				? `Unexpected character '${char}' at position ${pos}`
				: `Caractère inattendu '${char}' à la position ${pos}`;
		}

		if (exception instanceof InvalidKeywordException) {
			const keyword = exception.getKeyword ? exception.getKeyword() : "?";
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return lang === "EN"
				? `Invalid keyword '${keyword}' at position ${pos}`
				: `Mot-clé invalide '${keyword}' à la position ${pos}`;
		}

		if (exception instanceof UnterminatedStringException) {
			const quote = exception.getQuoteType ? exception.getQuoteType() : "?";
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return lang === "EN"
				? `Unterminated string starting with ${quote} at position ${pos}`
				: `Chaîne non terminée commençant par ${quote} à la position ${pos}`;
		}

		return null;
	}
}
