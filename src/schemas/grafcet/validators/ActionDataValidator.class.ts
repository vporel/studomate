import Variable from "@/schemas/variable/Variable.class";
import ExceptionHelper from "@/simulation/interpreter/ExceptionHelper.class";
import { Language } from "@/simulation/interpreter/lexer/Language.enum";
import { Lexer } from "@/simulation/interpreter/lexer/Lexer.class";
import Token from "@/simulation/interpreter/lexer/tokens/Token.interface";
import Parser from "@/simulation/interpreter/parser/Parser.class";
import SemanticAnalyser from "@/simulation/interpreter/semantic-analyzer/SemanticAnalyser.class";
import { Environment } from "@/simulation/runtime/Environment.class";
import Action, {
	ACTION_EXECUTION_MODE_LABELS,
	ACTION_TYPES_LABELS,
	ActionData,
	ActionType,
} from "../Action.class";
import Grafcet from "../Grafcet.class";
import { ASSIGNMENT_OPERATOR } from "../symbols";
import ElementDataValidator from "./ElementDataValidator.class";
import { ElementValidateDataOptions } from "./types";

export default class ActionDataValidator extends ElementDataValidator<ActionData> {
	private lexer = new Lexer(Language.FR);

	validateData(
		elementId: string,
		data: Partial<ActionData>,
		grafcet: Grafcet,
		options: ElementValidateDataOptions,
	): string[] {
		const errors: string[] = [];
		const element = grafcet.getElementByIdAndType<Action>(elementId, "action");
		if (!element) throw new Error(`Element of type "action" with id ${elementId} not found in grafcet`);
		if (data.type || data.executionMode) {
			const type = data.type || element.data.type;
			const executionMode = data.executionMode || element.data.executionMode;
			if (!Action.isValidExecutionModeForType(type, executionMode)) {
				errors.push(
					`Mode d'exécution "${executionMode !== null ? ACTION_EXECUTION_MODE_LABELS[executionMode] : "null"}" incompatible avec le type d'action "${ACTION_TYPES_LABELS[type]}"`,
				);
			}
		}
		if (data.expression) {
			const type = data.type || element.data.type;
			if (type !== ActionType.TEXT) {
				errors.push(
					...this.validateExpression(
						data.expression,
						options.fullValidation || false,
						options.projectData.variables,
					),
				);
			}
		}
		return errors;
	}

	/**
	 * We just make a lexical analysis
	 * The syntax will be checked when the user asks for it or tries to run simulation
	 * @param expression
	 * @returns
	 */
	private validateExpression(
		expression: string,
		fullValidation: boolean,
		projectVariables?: Variable[],
	): string[] {
		const errors: string[] = [];
		let tokens: Token[] = [];
		try {
			tokens = this.lexer.tokenize(expression);
		} catch (e) {
			errors.push(ExceptionHelper.getUserFriendlyMessage(e));
		}
		if (fullValidation && tokens.length > 0) {
			if (!projectVariables)
				throw new Error("Project variables are required for full validation of action expressions");
			const parser = new Parser(tokens);
			let ASTNode = null;
			try {
				ASTNode = parser.parse();
			} catch (e) {
				errors.push(ExceptionHelper.getUserFriendlyMessage(e));
			}
			if (ASTNode) {
				const semanticAnalyser = new SemanticAnalyser();
				const env = new Environment(
					projectVariables.map((v) => ({
						id: v.id,
						name: v.mnemonic,
						type: v.getNativeType(),
						direction: v.getDirection(),
					})),
				);
				try {
					semanticAnalyser.analyse(ASTNode, env);
				} catch (e) {
					errors.push(ExceptionHelper.getUserFriendlyMessage(e));
				}
			}
		}
		return errors;
	}

	private _getExpressionErrors(
		type: ActionType,
		expression: string,
		projectVariables: Variable[],
	): string[] {
		const errors: string[] = [];
		const lines = expression
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		const variablesMnemonics = projectVariables.map((v) => v.mnemonic);
		lines.forEach((line) => {
			//For variable assignment expressions, we check that the variable exists
			const parts = line.split(ASSIGNMENT_OPERATOR).map((part) => part.trim());
			if (type === ActionType.BOOLEAN_VARIABLE) {
				if (parts.length !== 1) {
					errors.push(
						`Expression "${line}" invalide : assignation non autorisées pour le type 'Variable booléenne'`,
					);
					return;
				}
			} else {
				if (parts.some((part) => part.length === 0)) {
					errors.push(`Expression "${line}" invalide : assignation incomplète`);
					return;
				} else if (parts.length !== 2) {
					errors.push(`Expression "${line}" invalide : format incorrect`);
					return;
				}
			}
			if (parts.length > 0) {
				const mnemonicInExpression = parts[0];
				if (!variablesMnemonics.includes(mnemonicInExpression)) {
					errors.push(`La variable "${mnemonicInExpression}" n'existe pas dans le projet`);
				}
			}
		});
		return errors;
	}
}
