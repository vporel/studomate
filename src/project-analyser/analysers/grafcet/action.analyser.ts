import SimulatorExceptionsHelper from "@/bridge/simulator-exceptions.helper";
import VariablesMapper from "@/bridge/variables.mapper";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import Variable, { NATIVE_TYPE_LABELS } from "@/schemas/variable/variable.schema";
import { Environment } from "@/simulator/compiler/environment/environment";
import { Language } from "@/simulator/compiler/lexer/language.enum";
import { Lexer } from "@/simulator/compiler/lexer/lexer";
import Parser from "@/simulator/compiler/parser/parser";
import SemanticAnalyserVisitor from "@/simulator/compiler/semantic-analyser/semantic-analyser.visitor";
import TypeAnalyserVisitor from "@/simulator/compiler/semantic-analyser/type-analyser.visitor";
import Action, { ActionType } from "../../../schemas/grafcet/action.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser from "./element.analyser";

export default class ActionAnalyser extends ElementAnalyser<Action> {
	/**
	 * Rules that apply to the action's own data, independently of the grafcet.
	 */
	analyseIsolated(action: Action): ProjectAnalyserIssue[] {
		const source = { sourceType: "grafcet-action" as const, sourceId: action.id };
		if (action.data.type === ActionType.TEXT) {
			return [
				new ProjectAnalyserIssue(
					"warning",
					source,
					"Cette action est de type TEXTE, elle n'aura aucun effet à l'exécution. Si vous voulez exécuter une expression, changez son type.",
				),
			];
		}
		const issues: ProjectAnalyserIssue[] = [];

		// Expression must not be empty for non-TEXT actions
		if (!action.data.expression || action.data.expression.trim() === "") {
			issues.push(new ProjectAnalyserIssue("warning", source, "L'action n'a pas d'expression."));
		} else {
			try {
				const lexer = new Lexer(Language.FR);
				action.getExpressionLines().forEach((line) => {
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
					if (action.data.type === ActionType.NUMERIC_VARIABLE) {
						if (node.type !== "ASSIGN_STATEMENT") {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									source,
									`Une action sur variable numérique doit être une affectation (ex: Var := X + Y).`,
								),
							);
						}
					}

					if (action.data.type === ActionType.STRING_VARIABLE) {
						if (node.type !== "ASSIGN_STATEMENT") {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									source,
									`Une action sur variable chaîne doit être une affectation (ex: Var := "Texte").`,
								),
							);
						}
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

		const step = ActionHelper.getStep(action.id, grafcet);

		if (!step) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "L'action n'est connectée à aucune étape."),
			);
		}

		if (action.data.expression && action.data.expression.trim() !== "") {
			try {
				const lexer = new Lexer(Language.FR);
				action.getExpressionLines().forEach((line) => {
					const parser = new Parser(lexer.tokenize(line));
					const node = parser.parse();
					const env = new Environment(variables.map(VariablesMapper.schemaToEnv));
					const semanticAnalyser = new SemanticAnalyserVisitor(env, {
						unauthorizedNodes: ["TIMER_BLOCK", "TIMER_STRING_DECLARATION"],
					});
					semanticAnalyser.visit(node);
					const typeAnalyser = new TypeAnalyserVisitor(env);
					if (node.type === "ASSIGN_STATEMENT") {
						const assignedVariableType = typeAnalyser.visit(node.left);
						if (
							action.data.type === ActionType.NUMERIC_VARIABLE &&
							assignedVariableType !== "number"
						) {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									source,
									`L'action est de type numérique mais la variable affectée est d'un type incompatible (${NATIVE_TYPE_LABELS[assignedVariableType as keyof typeof NATIVE_TYPE_LABELS]})`,
								),
							);
						}
						if (
							action.data.type === ActionType.STRING_VARIABLE &&
							assignedVariableType !== "string"
						) {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									source,
									`L'action est de type chaîne de caractères mais la variable affectée est d'un type incompatible (${NATIVE_TYPE_LABELS[assignedVariableType as keyof typeof NATIVE_TYPE_LABELS]})`,
								),
							);
						}
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

		return issues;
	}
}
