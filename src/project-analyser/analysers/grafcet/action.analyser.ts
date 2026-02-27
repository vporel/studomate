import SimulatorExceptionsHelper from "@/bridge/simulator-exceptions.helper";
import Variable from "@/schemas/variable/variable.schema";
import { Language } from "@/simulator/compiler/lexer/language.enum";
import { Lexer } from "@/simulator/compiler/lexer/lexer";
import Parser from "@/simulator/compiler/parser/parser";
import Action, { ActionType } from "../../../schemas/grafcet/action.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser from "./element.analyser";

export default class ActionAnalyser extends ElementAnalyser<Action> {
	/**
	 * Rules that apply to the action's own data, independently of the grafcet.
	 */
	analyseIsolated(action: Action): ProjectAnalyserIssue[] {
		if (action.data.type === ActionType.TEXT) return [];
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-action" as const, sourceId: action.id };

		// Expression must not be empty for non-TEXT actions
		if (!action.data.expression || action.data.expression.trim() === "") {
			issues.push(new ProjectAnalyserIssue("warning", source, "L'action n'a pas d'expression."));
		} else {
			try {
				const lexer = new Lexer(Language.FR);
				const lines = action.data.expression
					.split("\n")
					.map((line) => line.trim())
					.filter((line) => line.length > 0);
				lines.forEach((line) => {
					const parser = new Parser(lexer.tokenize(line));
					const node = parser.parse();
					if (action.data.type === ActionType.BOOLEAN_VARIABLE && node.type !== "IDENTIFIER") {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								source,
								`Une action booléenne doit être une simple référence à une variable.`,
							),
						);
					}
				});
			} catch (e) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						source,
						SimulatorExceptionsHelper.getUserFriendlyMessage(e, "FR"),
					),
				);
			}
		}

		// ExecutionMode must be set and compatible with the action type
		if (!Action.isValidExecutionModeForType(action.data.type, action.data.executionMode)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					`Le mode d'exécution "${action.data.executionMode}" est incompatible avec le type d'action "${action.data.type}".`,
				),
			);
		}

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(action: Action, grafcet: Grafcet, variables: Variable[]): ProjectAnalyserIssue[] {
		if (action.data.type === ActionType.TEXT) return [];

		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-action" as const, sourceId: action.id };

		const parentSteps = grafcet.connections.filter(
			(c) => c.target.id === action.id && c.source.type === "step",
		);

		if (parentSteps.length === 0) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "L'action n'est connectée à aucune étape."),
			);
		} else if (parentSteps.length > 1) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					`L'action est connectée à ${parentSteps.length} étapes. Une action ne peut être reliée qu'à une seule étape.`,
				),
			);
		}

		return issues;
	}
}
