import Variable from "@/schemas/variable/Variable.class";
import ExceptionHelper from "@/simulation/interpreter/ExceptionHelper.class";
import { Language } from "@/simulation/interpreter/lexer/Language.enum";
import { Lexer } from "@/simulation/interpreter/lexer/Lexer.class";
import Token from "@/simulation/interpreter/lexer/tokens/Token.interface";
import Parser from "@/simulation/interpreter/parser/Parser.class";
import SemanticAnalyser from "@/simulation/interpreter/semantic-analyzer/SemanticAnalyser.class";
import { Environment } from "@/simulation/runtime/Environment.class";
import Grafcet from "../Grafcet.class";
import Transition, { TransitionData } from "../Transition.class";
import ElementDataValidator from "./ElementDataValidator.class";
import { ElementValidateDataOptions } from "./types";

export default class TransitionDataValidator extends ElementDataValidator<TransitionData> {
	private lexer = new Lexer(Language.FR);

	validateData(
		elementId: string,
		data: TransitionData,
		grafcet: Grafcet,
		options: ElementValidateDataOptions,
	): string[] {
		const element = grafcet.getElementByIdAndType<Transition>(elementId, "transition");
		if (!element)
			throw new Error(`Element of type "transition" with id ${elementId} not found in grafcet`);
		const errors: string[] = [];

		if (data.expression && data.expression.trim() !== "") {
			//We allow empty expressions because the user can create the transition before writing the expression
			errors.push(
				...this.validateExpression(
					data.expression,
					options.fullValidation || false,
					options.projectData.variables,
				),
			);
		}

		return errors;
	}

	/**
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
}
