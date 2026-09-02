import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import TypeAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/type-analyser.visitor";
import Action, {
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class ActionAnalyser extends GrafcetElementAnalyser<Action> {
	/**
	 * Rules that apply to the action's own data, independently of the grafcet.
	 */
	analyseIsolated(
		action: Action,
		{ dialect = Dialect.FR }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const source = {
			sourceType: "grafcet-action" as const,
			sourceId: action.id,
		};
		// Une action TEXTE (description littérale, niveau 1 de spécification GRAFCET, ex :
		// "serrer la pièce") est une forme normale et attendue, pas une erreur ni un oubli.
		if (action.data.type === ActionType.TEXT) return [];
		const issues: ProjectAnalyserIssue[] = [];

		// Expression must not be empty for non-TEXT actions
		if (!action.data.expression || action.data.expression.trim() === "") {
			issues.push(
				new ProjectAnalyserIssue("warning", "ACTION_EMPTY_EXPRESSION", source),
			);
		} else {
			try {
				action.getExpressionLines().forEach((line) => {
					const { ast: node } = parseExpressionCached(line, dialect);
					if (
						action.data.type === ActionType.BOOLEAN_VARIABLE &&
						node.type !== "IDENTIFIER"
					) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"ACTION_BOOLEAN_MUST_BE_IDENTIFIER",
								source,
							),
						);
					}
					if (action.data.type === ActionType.NUMERIC_VARIABLE) {
						if (node.type !== "ASSIGN_STATEMENT") {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									"ACTION_NUMERIC_MUST_BE_ASSIGNMENT",
									source,
								),
							);
						}
					}

					if (action.data.type === ActionType.STRING_VARIABLE) {
						if (node.type !== "ASSIGN_STATEMENT") {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									"ACTION_STRING_MUST_BE_ASSIGNMENT",
									source,
								),
							);
						}
					}
				});
			} catch (e) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"ACTION_INVALID_EXPRESSION",
						source,
						{},
						e,
					),
				);
			}
		}

		// ExecutionMode must be set and compatible with the action type
		if (
			!Action.isValidExecutionModeForType(
				action.data.type,
				action.data.executionMode,
			)
		) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"ACTION_INCOMPATIBLE_EXECUTION_MODE",
					source,
					{
						executionMode: action.data.executionMode ?? "",
						actionType: action.data.type,
					},
				),
			);
		}

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		action: Action,
		grafcet: Grafcet,
		env: Environment,
		dialect: Dialect = Dialect.FR,
	): ProjectAnalyserIssue[] {
		if (action.data.type === ActionType.TEXT) return [];

		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-action" as const,
			sourceId: action.id,
		};

		// Une connexion structurellement invalide (type inattendu) est déjà relevée par la
		// règle de niveau grafcet GRAFCET_CONNECTION_INVALID_TYPE ; on l'avale ici pour ne
		// pas rompre le contrat "l'analyse ne lève jamais".
		let step = null;
		try {
			step = ActionHelper.getStep(action.id, grafcet);
		} catch {
			return issues;
		}

		if (!step) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"ACTION_NOT_CONNECTED_TO_STEP",
					source,
				),
			);
		}

		// Uniquement pour les actions booléennes (référence directe à la variable) : pour
		// NUMERIC_VARIABLE/STRING_VARIABLE, une affectation vers une variable IN ou d'un type
		// incompatible est déjà interceptée plus haut par SemanticAnalyserVisitor.
		let writtenVariableName: string | null = null;

		if (action.data.expression && action.data.expression.trim() !== "") {
			try {
				action.getExpressionLines().forEach((line) => {
					const { ast: node } = parseExpressionCached(line, dialect);
					const semanticAnalyser = new SemanticAnalyserVisitor(env, {
						unauthorizedNodes: ["TIMER_BLOCK", "TIMER_STRING_DECLARATION"],
					});
					semanticAnalyser.visit(node);
					//Folds constant sub-expressions to catch errors only detectable once computed (e.g.
					//a literal division by zero) — the pre-compiler runs the same simplification, and any
					//error surfacing only there instead of here would mean this analyser is incomplete.
					new SimplifierVisitor().visit(node);
					const typeAnalyser = new TypeAnalyserVisitor(env);
					if (
						action.data.type === ActionType.BOOLEAN_VARIABLE &&
						node.type === "IDENTIFIER"
					) {
						writtenVariableName = node.value;
					}
					if (node.type === "ASSIGN_STATEMENT") {
						const assignedVariableType = typeAnalyser.visit(node.left);
						if (
							action.data.type === ActionType.NUMERIC_VARIABLE &&
							assignedVariableType !== "number"
						) {
							issues.push(
								new ProjectAnalyserIssue(
									"error",
									"ACTION_NUMERIC_TYPE_MISMATCH",
									source,
									{ actualType: assignedVariableType },
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
									"ACTION_STRING_TYPE_MISMATCH",
									source,
									{ actualType: assignedVariableType },
								),
							);
						}
					}
				});
			} catch (e) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"ACTION_INVALID_EXPRESSION",
						source,
						{},
						e,
					),
				);
			}
		}

		if (writtenVariableName) {
			if (
				env.existsVariableWithName(writtenVariableName) &&
				env.getVariableDirectionByName(writtenVariableName) === "IN"
			) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"ACTION_VARIABLE_IS_INPUT",
						source,
						{ variableName: writtenVariableName },
					),
				);
			}

			const stepVariableMnemonics = new Set(
				Object.values(grafcet.steps)
					.filter(
						(s) =>
							Number.isInteger(s.data.number) && (s.data.number as number) >= 0,
					)
					.map((s) =>
						StepHelper.getStepVariableMnemonic(s.data.number as number),
					),
			);
			if (stepVariableMnemonics.has(writtenVariableName)) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"ACTION_STEP_VARIABLE_READONLY",
						source,
						{ variableName: writtenVariableName },
					),
				);
			}
		}

		if (
			step &&
			writtenVariableName &&
			action.data.type === ActionType.BOOLEAN_VARIABLE &&
			(action.data.executionMode === ActionExecutionMode.SET ||
				action.data.executionMode === ActionExecutionMode.RESET)
		) {
			const opposedMode =
				action.data.executionMode === ActionExecutionMode.SET
					? ActionExecutionMode.RESET
					: ActionExecutionMode.SET;
			// Une connexion structurellement invalide chez une action sœur est déjà relevée par
			// GRAFCET_CONNECTION_INVALID_TYPE ; on l'avale ici pour ne pas rompre le contrat
			// "l'analyse ne lève jamais".
			let siblingActions: Action[] = [];
			try {
				siblingActions = StepHelper.getActions(step.id, grafcet) as Action[];
			} catch {
				siblingActions = [];
			}
			const hasConflict = siblingActions.some(
				(sibling) =>
					sibling.id !== action.id &&
					sibling.data.type === ActionType.BOOLEAN_VARIABLE &&
					sibling.data.executionMode === opposedMode &&
					sibling.getExpressionLines()[0] === writtenVariableName,
			);
			if (hasConflict) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"ACTION_SET_RESET_CONFLICT_SAME_STEP",
						source,
						{ variableName: writtenVariableName },
					),
				);
			}
		}

		return issues;
	}
}
