import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import InvalidCharacterException from "@/expression-language/lexer/exceptions/invalid-character.exception";
import InvalidKeywordException from "@/expression-language/lexer/exceptions/invalid-keyword.exception";
import UnterminatedStringException from "@/expression-language/lexer/exceptions/unterminated-string.exception";
import BadTokenTypeException from "@/expression-language/parser/exceptions/bad-token-type.exception";
import MissingPrimaryOrLeftParentheseException from "@/expression-language/parser/exceptions/missing-primary-or-left-parenthese.exception";
import MissingRightParentheseException from "@/expression-language/parser/exceptions/missing-right-parenthese.exception";
import ParsingEndedBeforeEOFException from "@/expression-language/parser/exceptions/parsing-ended-before-eof.exception";
import UnknownVariableNameException from "@/simulator/interpreter/environment/exceptions/unknown-variable-name.exception";
import { DivisionByZeroException } from "@/expression-language/interpreter/exceptions/division-by-zero.exception";
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
import InvalidControlConditionTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-control-condition-type.exception";
import InvalidTimerElapsedTimeNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-timer-elapsed-time-node.exception";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import frExpressionErrors from "@/i18n/messages/fr/expressionErrors.json";
import enExpressionErrors from "@/i18n/messages/en/expressionErrors.json";
import InvalidCounterLastInputNodeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-last-input-node.exception";
import InvalidCounterLastInputTypeException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-counter-last-input-type.exception";
import SimulatorExceptionsMapper from "./simulator-exceptions.mapper";
import BitStringArithmeticException from "@/simulator/interpreter/semantic-analyser/exceptions/bit-string-arithmetic.exception";
import ConstantOutOfRangeException from "@/simulator/interpreter/semantic-analyser/exceptions/constant-out-of-range.exception";
import ExplicitConversionRequiredException from "@/simulator/interpreter/semantic-analyser/exceptions/explicit-conversion-required.exception";
import IncompatibleNumericTypesException from "@/simulator/interpreter/semantic-analyser/exceptions/incompatible-numeric-types.exception";
import InvalidConversionArgumentException from "@/simulator/interpreter/semantic-analyser/exceptions/invalid-conversion-argument.exception";
import InvalidTimeLiteralException from "@/expression-language/lexer/exceptions/invalid-time-literal.exception";
import UnknownFunctionException from "@/expression-language/parser/exceptions/unknown-function.exception";

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

function counterNode(): CounterNode {
	return BlocksBuilder.buildCounterNode(
		"CTU",
		LiteralsBuilder.buildBooleanNode(true, 0),
		IdentifiersBuilder.buildIdentifierNode("lastInput", 0),
		LiteralsBuilder.buildBooleanNode(false, 0),
		LiteralsBuilder.buildNumberNode(5, 0),
		IdentifiersBuilder.buildIdentifierNode("cv", 0),
		IdentifiersBuilder.buildIdentifierNode("output", 0),
	);
}

const message = (exception: unknown, locale: "fr" | "en" = "fr") =>
	SimulatorExceptionsMapper.getUserFriendlyMessage(exception, locale);

describe("SimulatorExceptionsMapper", () => {
	describe("environment exceptions", () => {
		it("maps UnknownVariableNameException", () => {
			const e = new UnknownVariableNameException("Foo");
			expect(message(e, "fr")).toBe("Variable inconnue : Foo");
			expect(message(e, "en")).toBe("Unknown variable name: Foo");
		});
	});

	describe("numeric typing exceptions", () => {
		const x = () => IdentifiersBuilder.buildIdentifierNode("x", 0);
		const arithmetic = () =>
			ExpressionsBuilder.buildArithmeticExpressionNode("*", x(), x(), 0);

		it("maps IncompatibleNumericTypesException with a conversion hint toward REAL", () => {
			const e = new IncompatibleNumericTypesException(
				"*",
				"DINT",
				"REAL",
				arithmetic(),
			);
			expect(message(e, "fr")).toBe(
				"Types DINT et REAL incompatibles pour l'opérateur « * » : convertissez explicitement l'un des opérandes (fonction DINT_TO_REAL).",
			);
			expect(message(e, "en")).toBe(
				'Types DINT and REAL are incompatible for operator "*": explicitly convert one of the operands (function DINT_TO_REAL).',
			);
		});

		it("maps IncompatibleNumericTypesException, converting a bit string to the integer", () => {
			const e = new IncompatibleNumericTypesException("=", "INT", "WORD", arithmetic());
			expect(message(e, "fr")).toContain("(fonction WORD_TO_INT)");
		});

		it("maps IncompatibleNumericTypesException without a hint for a constant", () => {
			const e = new IncompatibleNumericTypesException(
				"*",
				"INT",
				"ANY_REAL",
				arithmetic(),
			);
			expect(message(e, "fr")).toBe(
				"Types INT et constante réelle incompatibles pour l'opérateur « * » : convertissez explicitement l'un des opérandes.",
			);
		});

		it("maps BitStringArithmeticException", () => {
			const e = new BitStringArithmeticException("+", "WORD", arithmetic());
			expect(message(e, "fr")).toBe(
				"Opérateur « + » interdit sur le type WORD (chaîne de bits) : convertissez d'abord la valeur en entier (WORD_TO_INT ou WORD_TO_DINT).",
			);
		});

		it("maps ConstantOutOfRangeException", () => {
			const e = new ConstantOutOfRangeException(40000, "INT", x());
			expect(message(e, "fr")).toBe(
				"La constante 40000 dépasse les limites du type INT.",
			);
			expect(message(e, "en")).toBe("Constant 40000 is out of the range of type INT.");
		});

		it("maps ExplicitConversionRequiredException, naming the conversion function", () => {
			const e = new ExplicitConversionRequiredException(
				"DINT",
				"INT",
				StatementsBuilder.buildAssignStatementNode(x(), x()),
			);
			expect(message(e, "fr")).toBe(
				"Affectation d'une valeur DINT à une variable INT : une conversion explicite est nécessaire (fonction DINT_TO_INT).",
			);
		});

		it("maps ExplicitConversionRequiredException without a hint when no conversion exists", () => {
			const e = new ExplicitConversionRequiredException(
				"TIME",
				"INT",
				StatementsBuilder.buildAssignStatementNode(x(), x()),
			);
			expect(message(e, "fr")).toBe(
				"Affectation d'une valeur TIME à une variable INT : une conversion explicite est nécessaire.",
			);
		});

		it("maps InvalidConversionArgumentException, with or without an expected type", () => {
			const node = ExpressionsBuilder.buildConversionExpressionNode(
				"DINT",
				"INT",
				x(),
			);
			expect(
				message(new InvalidConversionArgumentException("INT", "DINT", "REAL", node), "fr"),
			).toBe("Conversion vers INT impossible : la valeur est de type REAL, DINT attendu.");
			expect(
				message(new InvalidConversionArgumentException("WORD", null, "REAL", node), "fr"),
			).toBe("Aucune conversion de REAL vers WORD.");
		});

		it("maps UnknownFunctionException and InvalidTimeLiteralException", () => {
			expect(message(new UnknownFunctionException("FOO", 3), "fr")).toContain(
				"Fonction inconnue « FOO » à la position 3",
			);
			expect(message(new InvalidTimeLiteralException("T#abc", 0), "fr")).toBe(
				"Constante de temps invalide « T#abc » à la position 0",
			);
		});
	});

	describe("semantic exceptions", () => {
		it("maps UnauthorizedNodeException", () => {
			const node = LiteralsBuilder.buildNumberNode(1, 0);
			const e = new UnauthorizedNodeException("NUMBER_LITERAL", node);
			const fr = message(e, "fr");
			const en = message(e, "en");
			expect(fr).toContain("Nœud non autorisé");
			expect(fr).toContain("Nombre");
			expect(en).toContain("Unauthorized node");
			expect(en).toContain("Number");
			expect(en).not.toContain("NUMBER_LITERAL");
		});

		it("maps UnknownIdentifierException", () => {
			const node = IdentifiersBuilder.buildIdentifierNode("Bar", 0);
			const e = new UnknownIdentifierException(node);
			expect(message(e, "fr")).toBe("Variable inconnue : Bar");
			expect(message(e, "en")).toBe("Unknown variable: Bar");
		});

		it("maps InvalidUnaryExprOperandTypeException, translating the operator to French", () => {
			const node = ExpressionsBuilder.buildUnaryExpressionNode(
				"NOT",
				LiteralsBuilder.buildNumberNode(1, 0),
				0,
			);
			const e = new InvalidUnaryExprOperandTypeException(
				"NOT",
				"boolean",
				"number",
				node,
			);
			expect(message(e, "fr")).toBe(
				"Type invalide pour l'opérateur « NON » : attendu booléen, obtenu nombre",
			);
			expect(message(e, "en")).toBe(
				'Invalid type for operator "NOT": expected boolean, got number',
			);
		});

		it("maps InvalidBinaryExprOperandTypeException, naming the offending side in French", () => {
			const node = ExpressionsBuilder.buildComparisonExpressionNode(
				"=",
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildBooleanNode(true, 0),
				0,
			) as any;
			const e = new InvalidBinaryExprOperandTypeException(
				"=",
				"right",
				"number",
				"boolean",
				node,
			);
			expect(message(e, "fr")).toBe(
				"Type invalide pour l'opérateur « = » côté droite : attendu nombre, obtenu booléen",
			);
			expect(message(e, "en")).toBe(
				'Invalid type for operator "=" on the right side: expected number, got boolean',
			);
		});

		it("maps InvalidAssignmentTargetException", () => {
			const node = StatementsBuilder.buildAssignStatementNode(
				LiteralsBuilder.buildNumberNode(1, 0),
				LiteralsBuilder.buildNumberNode(2, 0),
				0,
			);
			const e = new InvalidAssignmentTargetException(node);
			expect(message(e, "fr")).toBe(
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
			expect(message(e, "fr")).toBe(
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
			const e = new IncompatibleOperandsTypesException(
				"=",
				"number",
				"string",
				node,
			);
			expect(message(e, "fr")).toBe(
				"Types incompatibles pour l'opérateur « = » : gauche nombre, droite chaîne de caractères",
			);
		});

		describe("timer-related exceptions", () => {
			it("maps InvalidTimerInputTypeException", () => {
				const e = new InvalidTimerInputTypeException("number", timerNode());
				expect(message(e, "fr")).toContain(
					"l'entrée d'une temporisation doit être un booléen",
				);
			});

			it("maps InvalidTimerLastInputNodeException", () => {
				const e = new InvalidTimerLastInputNodeException(timerNode());
				expect(message(e, "fr")).toContain(
					"la dernière valeur d'entrée d'un bloc de temporisation doit être une variable",
				);
			});

			it("maps InvalidTimerLastInputTypeException", () => {
				const e = new InvalidTimerLastInputTypeException("number", timerNode());
				expect(message(e, "fr")).toContain("doit être un booléen (trouvé nombre)");
			});

			it("maps InvalidCounterLastInputNodeException", () => {
				const e = new InvalidCounterLastInputNodeException(counterNode());
				expect(message(e, "fr")).toContain(
					"la dernière valeur d'entrée d'un bloc compteur doit être une variable",
				);
				expect(message(e, "en")).toContain(
					"the last input of a counter block must be an identifier",
				);
			});

			it("maps InvalidCounterLastInputTypeException", () => {
				const e = new InvalidCounterLastInputTypeException("number", counterNode());
				expect(message(e, "fr")).toContain(
					"dernière valeur d'entrée d'un bloc compteur doit être un booléen (trouvé nombre)",
				);
			});

			it("maps InvalidTimerOutputNodeException", () => {
				const e = new InvalidTimerOutputNodeException(timerNode());
				expect(message(e, "fr")).toContain(
					"la sortie d'un bloc de temporisation doit être une variable",
				);
			});

			it("maps InvalidTimerOutputTypeException", () => {
				const e = new InvalidTimerOutputTypeException("string", timerNode());
				expect(message(e, "fr")).toContain(
					"doit retourner un booléen (trouvé chaîne de caractères)",
				);
			});

			it("maps InvalidTimerPresetTimeTypeException", () => {
				const e = new InvalidTimerPresetTimeTypeException("boolean", timerNode());
				expect(message(e, "fr")).toContain("attendu nombre, obtenu booléen");
			});

			it("maps InvalidTimerElapsedTimeTypeException", () => {
				const e = new InvalidTimerElapsedTimeTypeException("string", timerNode());
				expect(message(e, "fr")).toContain(
					"attendu nombre, obtenu chaîne de caractères",
				);
			});
		});
	});

	describe("interpreter exceptions", () => {
		it("maps DivisionByZeroException", () => {
			const node = LiteralsBuilder.buildNumberNode(1, 0);
			const e = new DivisionByZeroException(10, 0, node);
			expect(message(e, "fr")).toBe("Division par zéro : 10 / 0");
			expect(message(e, "en")).toBe("Division by zero: 10 / 0");
		});
	});

	describe("parser exceptions", () => {
		it("maps ParsingEndedBeforeEOFException", () => {
			const e = new ParsingEndedBeforeEOFException({
				type: "EOF",
				position: 5,
			} as any);
			expect(message(e, "fr")).toContain("caractère inattendu à la position 5");
		});

		it("maps MissingPrimaryOrLeftParentheseException", () => {
			const e = new MissingPrimaryOrLeftParentheseException({
				type: "PLUS",
				position: 3,
			} as any);
			expect(message(e, "fr")).toContain(
				"Expression attendue (variable, nombre, chaîne) ou '(' à la position 3",
			);
		});

		it("maps MissingRightParentheseException", () => {
			const e = new MissingRightParentheseException(7, false);
			expect(message(e, "fr")).toBe(
				"Parenthèse fermante manquante à la position 7",
			);
		});

		it("maps MissingRightParentheseException at end of input", () => {
			const e = new MissingRightParentheseException(7, true);
			expect(message(e, "fr")).toBe(
				"Parenthèse fermante manquante à la position 7 (fin d'entrée)",
			);
		});

		it("maps BadTokenTypeException", () => {
			const e = new BadTokenTypeException(
				["PLUS", "MINUS"] as any,
				"STAR" as any,
				4,
			);
			expect(message(e, "fr")).toContain("Jeton inattendu à la position 4");
		});
	});

	describe("lexer exceptions", () => {
		it("maps InvalidCharacterException", () => {
			const e = new InvalidCharacterException("$", 2);
			expect(message(e, "fr")).toBe("Caractère inattendu « $ » à la position 2");
		});

		it("maps InvalidKeywordException", () => {
			const e = new InvalidKeywordException("SI", 6);
			expect(message(e, "fr")).toContain("Mot-clé invalide");
		});

		it("maps UnterminatedStringException", () => {
			const e = new UnterminatedStringException('"', 8);
			expect(message(e, "fr")).toContain("Chaîne non terminée");
		});
	});

	describe("timer / contrôle : nœuds", () => {
		it("maps InvalidTimerElapsedTimeNodeException", () => {
			const e = new InvalidTimerElapsedTimeNodeException(timerNode());
			expect(message(e, "fr")).toContain(
				"Nœud de temps écoulé de temporisation invalide",
			);
			expect(message(e, "en")).toContain("Invalid timer elapsed time node");
		});

		it("maps InvalidControlConditionTypeException", () => {
			const control = ControlsBuilder.buildIfControlNode(
				LiteralsBuilder.buildNumberNode(1, 0),
				[],
				null,
				0,
			);
			const e = new InvalidControlConditionTypeException(control);
			expect(message(e, "fr")).toContain(
				"la condition d'une structure de contrôle doit être un booléen",
			);
			expect(message(e, "en")).toContain("Invalid control condition type");
		});
	});

	describe("exhaustivité du mapper", () => {
		/**
		 * Exceptions du simulateur volontairement non traduites : classes de base, ou invariants
		 * internes jamais atteints par une saisie utilisateur. Toute autre exception du dossier
		 * doit avoir une entrée `instanceof` dans le mapper (sinon message brut anglais côté UI).
		 */
		const INTENTIONALLY_UNMAPPED = new Set([
			"EnvironmentException", // classe de base
			"SemanticException", // classe de base
			"InvalidNodeTypeException", // classe de base des exceptions de type
			"BinaryOperandsTypesException", // classe de base des exceptions d'opérandes incompatibles
			"UnknownVariableIdException", // lookup par id interne : l'environnement pré-résout les noms
			"IllegalVariableValueTypeException", // invariant interne sur l'écriture d'une variable d'env
		]);

		function collectExceptionClassNames(dir: string): string[] {
			const names: string[] = [];
			for (const entry of readdirSync(dir, { withFileTypes: true })) {
				const full = join(dir, entry.name);
				if (entry.isDirectory()) names.push(...collectExceptionClassNames(full));
				else if (entry.name.endsWith(".exception.ts")) {
					const match = readFileSync(full, "utf8").match(
						/class\s+([A-Za-z0-9_]+)/,
					);
					if (match) names.push(match[1]);
				}
			}
			return names;
		}

		it("toute exception du simulateur est mappée ou explicitement allowlistée", () => {
			const exceptionsDir = join(__dirname, "../simulator/interpreter");
			const declared = collectExceptionClassNames(exceptionsDir);

			const mapperSource = readFileSync(
				join(__dirname, "simulator-exceptions.mapper.ts"),
				"utf8",
			);
			const mapped = new Set(
				[...mapperSource.matchAll(/instanceof\s+([A-Za-z0-9_]+)/g)].map(
					(m) => m[1],
				),
			);

			const unaccounted = declared.filter(
				(name) => !mapped.has(name) && !INTENTIONALLY_UNMAPPED.has(name),
			);

			expect(unaccounted).toEqual([]);
		});

		it("les dictionnaires fr et en portent les mêmes codes d'erreur d'expression", () => {
			expect(Object.keys(enExpressionErrors).sort()).toEqual(
				Object.keys(frExpressionErrors).sort(),
			);
		});
	});

	describe("fallback behaviour", () => {
		it("falls back to the raw message of a generic Error", () => {
			const e = new Error("boom");
			expect(message(e, "fr")).toBe("boom");
		});

		it("falls back to a generic message when a generic Error has no message", () => {
			const e = new Error("");
			expect(message(e, "fr")).toBe("Expression invalide : erreur inconnue");
			expect(message(e, "en")).toBe("Invalid expression: unknown error");
		});

		it("stringifies a thrown value that isn't an Error", () => {
			expect(message("plain string", "fr")).toBe("plain string");
		});

		it("defaults to French when no locale is given", () => {
			const e = new UnknownVariableNameException("Foo");
			expect(SimulatorExceptionsMapper.getUserFriendlyMessage(e)).toBe(
				"Variable inconnue : Foo",
			);
		});
	});
});
