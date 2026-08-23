import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import Variable from "@/schemas/variable/variable.schema";
import { TimerStringDeclarationNode } from "@/expression-language/ast/nodes/blocks";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { Lexer } from "@/expression-language/lexer/lexer";
import Parser from "@/expression-language/parser/parser";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import TypeAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/type-analyser.visitor";
import Grafcet from "@/schemas/grafcet/grafcet.schema";
import Transition from "@/schemas/grafcet/transition.schema";
import ProjectAnalyserIssue from "@/project-analyser/project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";
import { buildEnvironmentCached } from "./build-environment.helper";

export default class TransitionAnalyser extends ElementAnalyser<Transition> {
	/**
	 * Rules that apply to the transition's own data, independently of the grafcet.
	 */
	analyseIsolated(
		transition: Transition,
		{ allowEmptyContent = false, dialect = Dialect.FR }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-transition" as const, sourceId: transition.id };

		if (!transition.data.expression || transition.data.expression.trim() === "") {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"TRANSITION_EMPTY_EXPRESSION",
						source,
						"La transition n'a pas d'expression. Elle ne pourra jamais être franchie.",
					),
				);
			}
			return issues;
		}
		try {
			const lexer = new Lexer(dialect);
			const parser = new Parser(lexer.tokenize(transition.getFullExpression()));
			const node = parser.parse();
			const typeAnalyser = new TypeAnalyserVisitor();
			if (node.type === "ASSIGN_STATEMENT") {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						"TRANSITION_ASSIGNMENT_NOT_ALLOWED",
						source,
						"Expression invalide : une transition ne peut pas être une affectation.",
					),
				);
			}
			if (node.type !== "IDENTIFIER" && typeAnalyser.visit(node) !== "boolean") {
				if (node.type === "NUMBER_LITERAL") {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"TRANSITION_NUMERIC_CONSTANT_NOT_ALLOWED",
							source,
							"Une transition ne peut pas être une constante numérique. Si vous voulez qu'elle soit toujours validée, utilisez plutôt la constante booléenne VRAI.",
						),
					);
				} else {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							"TRANSITION_EXPRESSION_NOT_BOOLEAN",
							source,
							"Expression invalide : une transition doit être une expression retournant un booléen.",
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
					SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR"),
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
		variables: Variable[],
		dialect: Dialect = Dialect.FR,
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-transition" as const, sourceId: transition.id };

		if (!TransitionHelper.hasPredecessor(transition.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_NO_PREDECESSOR",
					source,
					"La transition n'a aucun élément en amont.",
				),
			);
		}

		if (!TransitionHelper.hasSuccessor(transition.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_NO_SUCCESSOR",
					source,
					"La transition n'a aucun élément en aval.",
				),
			);
		}

		if (TransitionHelper.getSuccessors(transition.id, grafcet).length > 1) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_MULTIPLE_SUCCESSORS",
					source,
					"Une transition ne peut avoir qu'un seul successeur direct. Utilisez une divergence en ET pour activer plusieurs étapes simultanément.",
				),
			);
		}

		if (TransitionHelper.getPredecessors(transition.id, grafcet).length > 1) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					"TRANSITION_MULTIPLE_PREDECESSORS",
					source,
					"Une transition ne peut avoir qu'un seul prédécesseur direct. Utilisez une convergence en ET pour synchroniser plusieurs étapes.",
				),
			);
		}
		if (transition.data.expression && transition.data.expression.trim() !== "") {
			try {
				const lexer = new Lexer(dialect);
				const parser = new Parser(lexer.tokenize(transition.getFullExpression()));
				const node = parser.parse();
				const env = buildEnvironmentCached(variables);
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
								`La transition fait référence à la variable "${node.value}" qui n'est pas booléenne.`,
							),
						);
					}
				}
				//Search for timer string declarations
				const finder = new FinderVisitor<TimerStringDeclarationNode>("TIMER_STRING_DECLARATION");
				const timerStringDeclarations = finder.visit(node);
				//For each declaration, make sure the name doesn't conflict with an existing variable
				timerStringDeclarations.forEach((decl) => {
					if (env.existsVariableWithName(decl.name)) {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								"TRANSITION_TIMER_NAME_CONFLICT",
								source,
								`L'identifiant de temporisation "${decl.name}" entre en conflit avec une variable existante.`,
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
						SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR"),
					),
				);
			}
		}

		return issues;
	}
}
