import IncompatibleOperandsTypesException from "@/simulator/interpreter/semantic-analyser/exceptions/incompatible-operands-types.exception";
import InputIdentifierAssignmentException from "@/simulator/interpreter/semantic-analyser/exceptions/input-identifier-assignment.exception";
import InvalidAssignmentTargetException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-assignment-target.exception";
import UnknownIdentifierException from "@/simulator/interpreter/semantic-analyser/exceptions/unknown-identifier.exception";

import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";

import UnknownVariableNameException from "@/simulator/interpreter/environment/exceptions/unknown-variable-name.exception";
import InvalidCounterControlTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-control-type.exception";
import InvalidCounterCurrentValueNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-current-value-node.exception";
import InvalidCounterCurrentValueTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-current-value-type.exception";
import InvalidCounterInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-input-type.exception";
import InvalidCounterOutputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-output-node.exception";
import InvalidCounterOutputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-output-type.exception";
import InvalidCounterPresetValueTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-preset-value-type.exception";
import InvalidControlConditionTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-control-condition-type.exception";
import InvalidTimerElapsedTimeNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-elapsed-time-node.exception";
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

import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import frExpressionErrors from "@/i18n/messages/fr/expressionErrors.json";
import { createTranslator } from "next-intl";

type MessageCode = Exclude<keyof typeof frExpressionErrors, "labels">;

/**
 * Descripteur i18n d'une exception : clé de message (namespace `expressionErrors`) et
 * paramètres ICU déjà résolus (libellés d'opérateur, de type, de nœud traduits).
 */
type MessageDescriptor = {
	code: MessageCode;
	params: Record<string, string | number>;
};

export default class SimulatorExceptionsMapper {
	/**
	 * Message lisible d'une exception levée par les modules du compilateur (lexer, parser,
	 * analyse sémantique, environnement, évaluateur).
	 */
	static getUserFriendlyMessage(
		exception: unknown,
		locale: Locale = DEFAULT_LOCALE,
	): string {
		const labels = getMessages(locale).expressionErrors.labels;
		const t = createTranslator({
			locale,
			messages: getMessages(locale),
			namespace: "expressionErrors",
		});

		const operatorLabel = (op: string): string =>
			(labels.operator as Record<string, string>)[op.toUpperCase()] ?? op;
		const typeLabel = (type: string): string =>
			(labels.nativeType as Record<string, string>)[type] ?? type;
		const sideLabel = (side: string): string =>
			(labels.side as Record<string, string>)[side] ?? side;
		const nodeTypeLabel = (nodeType: string): string =>
			(labels.astNodeType as Record<string, string>)[nodeType] ?? nodeType;

		const descriptor =
			this.describeEnvironmentException(exception) ??
			this.describeSemanticException(exception, {
				operatorLabel,
				typeLabel,
				sideLabel,
				nodeTypeLabel,
			}) ??
			this.describeInterpreterException(exception) ??
			this.describeParserException(exception) ??
			this.describeLexerException(exception);

		if (descriptor) return t(descriptor.code, descriptor.params);

		if (exception instanceof Error) {
			return exception.message || t("UNKNOWN_ERROR");
		}
		return String(exception);
	}

	private static describeEnvironmentException(
		exception: unknown,
	): MessageDescriptor | null {
		if (exception instanceof UnknownVariableNameException) {
			return {
				code: "UNKNOWN_VARIABLE_NAME",
				params: { variableName: exception.getVariableName() },
			};
		}
		return null;
	}

	private static describeSemanticException(
		exception: unknown,
		labels: LabelResolvers,
	): MessageDescriptor | null {
		const { operatorLabel, typeLabel, sideLabel, nodeTypeLabel } = labels;

		if (exception instanceof UnauthorizedNodeException) {
			return {
				code: "UNAUTHORIZED_NODE",
				params: { nodeType: nodeTypeLabel(exception.getNodeType()) },
			};
		}

		if (exception instanceof UnknownIdentifierException) {
			return {
				code: "UNKNOWN_IDENTIFIER",
				params: { identifier: exception.getIdentifier() },
			};
		}

		if (exception instanceof InvalidUnaryExprOperandTypeException) {
			return {
				code: "INVALID_UNARY_OPERAND_TYPE",
				params: {
					operator: operatorLabel(exception.getOperator()),
					expected: typeLabel(exception.getExpectedType()),
					actual: typeLabel(exception.getActualType()),
				},
			};
		}

		if (exception instanceof InvalidBinaryExprOperandTypeException) {
			return {
				code: "INVALID_BINARY_OPERAND_TYPE",
				params: {
					operator: operatorLabel(exception.getOperator()),
					side: sideLabel(exception.getSide()),
					expected: typeLabel(exception.getExpectedType()),
					actual: typeLabel(exception.getActualType()),
				},
			};
		}

		if (exception instanceof InvalidAssignmentTargetException) {
			return { code: "INVALID_ASSIGNMENT_TARGET", params: {} };
		}

		if (exception instanceof InputIdentifierAssignmentException) {
			return { code: "INPUT_IDENTIFIER_ASSIGNMENT", params: {} };
		}

		if (exception instanceof IncompatibleOperandsTypesException) {
			return {
				code: "INCOMPATIBLE_OPERANDS_TYPES",
				params: {
					operator: operatorLabel(exception.getOperator()),
					leftType: typeLabel(exception.getLeftType()),
					rightType: typeLabel(exception.getRightType()),
				},
			};
		}

		if (exception instanceof InvalidTimerInputTypeException) {
			return {
				code: "INVALID_TIMER_INPUT_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidTimerLastInputNodeException) {
			return { code: "INVALID_TIMER_LAST_INPUT_NODE", params: {} };
		}

		if (exception instanceof InvalidTimerLastInputTypeException) {
			return {
				code: "INVALID_TIMER_LAST_INPUT_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidTimerOutputNodeException) {
			return { code: "INVALID_TIMER_OUTPUT_NODE", params: {} };
		}

		if (exception instanceof InvalidTimerOutputTypeException) {
			return {
				code: "INVALID_TIMER_OUTPUT_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidTimerPresetTimeTypeException) {
			return {
				code: "INVALID_TIMER_PRESET_TIME_TYPE",
				params: {
					expected: typeLabel(exception.getExpectedType()),
					actual: typeLabel(exception.getActualType()),
				},
			};
		}

		if (exception instanceof InvalidTimerElapsedTimeNodeException) {
			return { code: "INVALID_TIMER_ELAPSED_TIME_NODE", params: {} };
		}

		if (exception instanceof InvalidTimerElapsedTimeTypeException) {
			return {
				code: "INVALID_TIMER_ELAPSED_TIME_TYPE",
				params: {
					expected: typeLabel(exception.getExpectedType()),
					actual: typeLabel(exception.getActualType()),
				},
			};
		}

		if (exception instanceof InvalidControlConditionTypeException) {
			return { code: "INVALID_CONTROL_CONDITION_TYPE", params: {} };
		}

		if (exception instanceof InvalidCounterInputTypeException) {
			return {
				code: "INVALID_COUNTER_INPUT_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidCounterControlTypeException) {
			return {
				code: "INVALID_COUNTER_CONTROL_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidCounterCurrentValueNodeException) {
			return { code: "INVALID_COUNTER_CURRENT_VALUE_NODE", params: {} };
		}

		if (exception instanceof InvalidCounterCurrentValueTypeException) {
			return {
				code: "INVALID_COUNTER_CURRENT_VALUE_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidCounterOutputNodeException) {
			return { code: "INVALID_COUNTER_OUTPUT_NODE", params: {} };
		}

		if (exception instanceof InvalidCounterOutputTypeException) {
			return {
				code: "INVALID_COUNTER_OUTPUT_TYPE",
				params: { actual: typeLabel(exception.getActualType()) },
			};
		}

		if (exception instanceof InvalidCounterPresetValueTypeException) {
			return {
				code: "INVALID_COUNTER_PRESET_VALUE_TYPE",
				params: {
					expected: typeLabel(exception.getExpectedType()),
					actual: typeLabel(exception.getActualType()),
				},
			};
		}

		return null;
	}

	private static describeInterpreterException(
		exception: unknown,
	): MessageDescriptor | null {
		if (exception instanceof DivisionByZeroException) {
			return {
				code: "DIVISION_BY_ZERO",
				params: { left: exception.getLeft(), right: exception.getRight() },
			};
		}
		return null;
	}

	private static describeParserException(
		exception: unknown,
	): MessageDescriptor | null {
		if (exception instanceof ParsingEndedBeforeEOFException) {
			return {
				code: "PARSING_ENDED_BEFORE_EOF",
				params: { position: exception.getPosition() },
			};
		}

		if (exception instanceof MissingPrimaryOrLeftParentheseException) {
			return {
				code: "MISSING_PRIMARY_OR_LEFT_PARENTHESE",
				params: { position: exception.getPosition() },
			};
		}

		if (exception instanceof MissingRightParentheseException) {
			return {
				code: exception.isEnd()
					? "MISSING_RIGHT_PARENTHESE_AT_END"
					: "MISSING_RIGHT_PARENTHESE",
				params: { position: exception.getPosition() },
			};
		}

		if (exception instanceof BadTokenTypeException) {
			return {
				code: "BAD_TOKEN_TYPE",
				params: {
					position: exception.getPosition(),
					expected: exception.getExpected().join(", "),
					actual: String(exception.getActual()),
				},
			};
		}

		return null;
	}

	private static describeLexerException(
		exception: unknown,
	): MessageDescriptor | null {
		if (exception instanceof InvalidCharacterException) {
			return {
				code: "INVALID_CHARACTER",
				params: {
					char: exception.getChar(),
					position: exception.getPosition(),
				},
			};
		}

		if (exception instanceof InvalidKeywordException) {
			return {
				code: "INVALID_KEYWORD",
				params: {
					keyword: exception.getKeyword(),
					position: exception.getPosition(),
				},
			};
		}

		if (exception instanceof UnterminatedStringException) {
			return {
				code: "UNTERMINATED_STRING",
				params: {
					quote: exception.getQuoteType(),
					position: exception.getPosition(),
				},
			};
		}

		return null;
	}
}

type LabelResolvers = {
	operatorLabel: (op: string) => string;
	typeLabel: (type: string) => string;
	sideLabel: (side: string) => string;
	nodeTypeLabel: (nodeType: string) => string;
};
