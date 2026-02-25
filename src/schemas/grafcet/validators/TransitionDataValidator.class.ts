import CompilerExceptionHelper from "@/bridge/compiler-exceptions.helper";
import Variable from "@/schemas/variable/Variable.class";
import { Environment } from "@/simulator/compiler/environment/environment";
import { Language } from "@/simulator/compiler/lexer/language.enum";
import { Lexer } from "@/simulator/compiler/lexer/lexer";
import Parser from "@/simulator/compiler/parser/parser";
import SemanticAnalyser from "@/simulator/compiler/semantic-analyser/semantic-analyser";
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
		try {
			const tokens = this.lexer.tokenize(expression);
			if (fullValidation && tokens.length > 0) {
				if (!projectVariables)
					throw new Error(
						"Project variables are required for full validation of action expressions",
					);
				const parser = new Parser(tokens);
				const ASTNode = parser.parse();
				const semanticAnalyser = new SemanticAnalyser();
				const env = new Environment(
					projectVariables.map((v) => ({
						id: v.id,
						name: v.mnemonic,
						type: v.getNativeType(),
						direction: v.getDirection(),
					})),
				);
				semanticAnalyser.analyse(ASTNode, env);
			}
		} catch (e) {
			errors.push(CompilerExceptionHelper.getUserFriendlyMessage(e));
		}
		return errors;
	}
}
