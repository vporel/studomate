/**
 * Returns user-friendly error messages for exceptions thrown by the expression lexer.
 */
import IncompatibleOperandsTypesException from "@/simulation/interpreter/semantic-analyzer/exceptions/IncompatibleOperandsTypesException.class";
import InvalidAssignmentTargetException from "@/simulation/interpreter/semantic-analyzer/exceptions/InvalidAssignmentTargetException.class";
import InvalidOperandTypeException from "@/simulation/interpreter/semantic-analyzer/exceptions/InvalidOperandTypeException.class";
import UnknownIdentifierException from "@/simulation/interpreter/semantic-analyzer/exceptions/UnknownIdentifierException.class";

import { DivisionByZeroException } from "@/simulation/interpreter/exceptions/DivisionByZeroException.class";

import BadTokenTypeException from "@/simulation/interpreter/parser/exceptions/BadTokenTypeException.class";
import MissingPrimaryOrLeftParentheseException from "@/simulation/interpreter/parser/exceptions/MissingPrimaryOrLeftParentheseException.class";
import MissingRightParentheseException from "@/simulation/interpreter/parser/exceptions/MissingRightParentheseException.class";
import ParsingEndedBeforeEOFException from "@/simulation/interpreter/parser/exceptions/ParsingEndedBeforeEOFException.class";

import InvalidCharacterException from "@/simulation/interpreter/lexer/exceptions/InvalidCharacterException.class";
import InvalidStringEndQuoteException from "@/simulation/interpreter/lexer/exceptions/InvalidStringEndQuoteException.class";
import UnterminatedStringException from "@/simulation/interpreter/lexer/exceptions/UnterminatedStringException.class";
import InputIdentifierAssignmentException from "./semantic-analyzer/exceptions/InputIdentifierAssignmentException.class";

export default class ExceptionHelper {
	static getUserFriendlyMessage(exception: unknown): string {
		const handlers = [
			this.getForSemanticException,
			this.getForInterpreterException,
			this.getForParserException,
			this.getForLexerException,
		];

		for (const h of handlers) {
			const msg = h.call(this, exception);
			if (msg) return msg;
		}

		if (exception instanceof Error) return exception.message || "Expression invalide : erreur inconnue";
		return "Expression invalide : erreur inconnue";
	}

	private static transformVariableType(type: string): string {
		switch (type) {
			case "number":
				return "nombre";
			case "string":
				return "chaîne de caractères";
			case "boolean":
				return "booléen";
			default:
				return type;
		}
	}

	private static getForSemanticException(exception: unknown): string | null {
		if (exception instanceof UnknownIdentifierException) {
			return `Variable inconnue : ${exception.getIdentifier()}`;
		}

		if (exception instanceof InvalidOperandTypeException) {
			const op = exception.getOperator();
			const side = exception.getSide();
			const expected = ExceptionHelper.transformVariableType(exception.getExpectedType());
			const actual = ExceptionHelper.transformVariableType(exception.getActualType());
			const sideFr = side === "left" ? "gauche" : "droite";
			return `Type invalide pour l'opérateur '${op}' côté ${sideFr} : attendu ${expected}, obtenu ${actual}`;
		}

		if (exception instanceof InvalidAssignmentTargetException) {
			return "Cible d'affectation invalide : la partie gauche doit être une variable.";
		}

		if (exception instanceof InputIdentifierAssignmentException) {
			return "Affectation invalide : la variable affectée est une variable d'entrée.";
		}

		if (exception instanceof IncompatibleOperandsTypesException) {
			const op = exception.getOperator();
			const leftType = ExceptionHelper.transformVariableType(exception.getLeftType());
			const rightType = ExceptionHelper.transformVariableType(exception.getRightType());
			return `Types incompatibles pour l'opérateur '${op}' : gauche ${leftType}, droite ${rightType}`;
		}

		return null;
	}

	private static getForInterpreterException(exception: unknown): string | null {
		if (exception instanceof DivisionByZeroException) {
			return `Division par zéro : ${exception.getLeft()} / ${exception.getRight()}`;
		}
		return null;
	}

	private static getForParserException(exception: unknown): string | null {
		if (exception instanceof ParsingEndedBeforeEOFException) {
			const token = (exception as any).getToken();
			const pos = token ? token.position : exception.getPosition?.() || "?";
			return `Expression invalide : caractère inattendu à la position ${pos}`;
		}

		if (exception instanceof MissingPrimaryOrLeftParentheseException) {
			const token = (exception as any).getToken();
			const pos = token ? token.position : exception.getPosition?.() || "?";
			return `Expression attendue (variable, nombre, chaîne) ou '(' à la position ${pos}`;
		}

		if (exception instanceof MissingRightParentheseException) {
			const pos = exception.getPosition ? exception.getPosition() : "?";
			const end = (exception as any).isEnd ? (exception as any).isEnd() : false;
			return `Parenthèse fermante manquante à la position ${pos}${end ? " (fin d'entrée)" : ""}`;
		}

		if (exception instanceof BadTokenTypeException) {
			const expected = exception.getExpected ? exception.getExpected() : [];
			const actual = exception.getActual ? exception.getActual() : null;
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return `Jeton inattendu à la position ${pos} : attendu ${expected.join(", ")}, trouvé ${actual}`;
		}

		return null;
	}

	private static getForLexerException(exception: unknown): string | null {
		if (exception instanceof InvalidCharacterException) {
			const char = exception.getChar ? exception.getChar() : "?";
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return `Caractère inattendu '${char}' à la position ${pos}`;
		}

		if (exception instanceof InvalidStringEndQuoteException) {
			const quote = exception.getQuoteType ? exception.getQuoteType() : "?";
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return `Guillemet de fin invalide '${quote}' pour la chaîne à la position ${pos}`;
		}

		if (exception instanceof UnterminatedStringException) {
			const quote = exception.getQuoteType ? exception.getQuoteType() : "?";
			const pos = exception.getPosition ? exception.getPosition() : "?";
			return `Chaîne non terminée commençant par ${quote} à la position ${pos}`;
		}

		return null;
	}
}
