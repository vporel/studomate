import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import { TimerStringDeclarationNode } from "@/expression-language/ast/nodes/blocks";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import TypeAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/type-analyser.visitor";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Transition from "@/schemas/grafcet/transition.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import GrafcetElementAnalyser, {
	ElementAnalyseIsolatedOptions,
} from "./element.analyser";

export default class TransitionAnalyser extends GrafcetElementAnalyser<Transition> {
	/**
	 * Rules that apply to the transition's own data, independently of the grafcet.
	 */
	analyseIsolated(
		transition: Transition,
		{
			allowEmptyContent = false,
			dialect = Dialect.FR,
		}: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-transition" as const,
			sourceId: transition.id,
		};

		if (
			!transition.data.expression ||
			transition.data.expression.trim() === ""
		) {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"TRANSITION_EMPTY_EXPRESSION",
						source,
					),
				);
			}
			return issues;
		}
		try {
			const { ast: node } = parseExpressionCached(
				transition.getFullExpression(),
				dialect,
			);
			const typeAnalyser = new TypeAnalyserVisitor();
			if (node.type === "ASSIGN_STATEMENT") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"TRANSITION_ASSIGNMENT_NOT_ALLOWED",
						source,
					),
				);
			}
			if (
				node.type !== "IDENTIFIER" &&
				typeAnalyser.visit(node) !== "boolean"
			) {
				if (node.type === "NUMBER_LITERAL") {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"TRANSITION_NUMERIC_CONSTANT_NOT_ALLOWED",
							source,
						),
					);
				} else {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"TRANSITION_EXPRESSION_NOT_BOOLEAN",
							source,
						),
					);
				}
			}
		} catch (e) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_INVALID_EXPRESSION",
					source,
					{},
					e,
				),
			);
		}

		return issues;
	}

	/**
	 * Rules that require knowledge of the full grafcet.
	 */
	analyseInContext(
		transition: Transition,
		grafcet: Grafcet,
		env: Environment,
		dialect: Dialect = Dialect.FR,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = {
			sourceType: "grafcet-transition" as const,
			sourceId: transition.id,
		};

		if (!TransitionHelper.hasPredecessor(transition.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_NO_PREDECESSOR",
					source,
				),
			);
		}

		if (!TransitionHelper.hasSuccessor(transition.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", "TRANSITION_NO_SUCCESSOR", source),
			);
		}

		if (TransitionHelper.getSuccessors(transition.id, grafcet).length > 1) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_MULTIPLE_SUCCESSORS",
					source,
				),
			);
		}

		if (TransitionHelper.getPredecessors(transition.id, grafcet).length > 1) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_MULTIPLE_PREDECESSORS",
					source,
				),
			);
		}
		if (
			transition.data.expression &&
			transition.data.expression.trim() !== ""
		) {
			try {
				const { ast: node } = parseExpressionCached(
					transition.getFullExpression(),
					dialect,
				);
				const semanticAnalyser = new SemanticAnalyserVisitor(env);
				semanticAnalyser.visit(node);
				//Folds constant sub-expressions to catch errors only detectable once computed (e.g.
				//a literal division by zero) — the pre-compiler runs the same simplification, and any
				//error surfacing only there instead of here would mean this analyser is incomplete.
				new SimplifierVisitor().visit(node);
				const typeAnalyser = new TypeAnalyserVisitor(env);
				const nodeType = typeAnalyser.visit(node);
				if (node.type === "IDENTIFIER") {
					if (nodeType !== "boolean") {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"TRANSITION_NON_BOOLEAN_VARIABLE_REFERENCE",
								source,
								{ variableName: node.value },
							),
						);
					}
				}
				//Search for timer string declarations
				const finder = new FinderVisitor<TimerStringDeclarationNode>(
					"TIMER_STRING_DECLARATION",
				);
				const timerStringDeclarations = finder.visit(node);
				//For each declaration, make sure the name doesn't conflict with an existing variable
				timerStringDeclarations.forEach((decl) => {
					if (env.existsVariableWithName(decl.name)) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"TRANSITION_TIMER_NAME_CONFLICT",
								source,
								{ timerName: decl.name },
							),
						);
					}
				});
			} catch (e) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"TRANSITION_INVALID_EXPRESSION",
						source,
						{},
						e,
					),
				);
			}
		}

		return issues;
	}
}
