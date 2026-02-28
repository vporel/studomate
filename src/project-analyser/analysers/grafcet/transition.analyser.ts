import SimulatorExceptionsHelper from "@/bridge/simulator-exceptions.helper";
import VariablesMapper from "@/bridge/variables.mapper";
import TransitionHelper from "@/schemas/grafcet/helpers/transition.helper";
import Variable from "@/schemas/variable/variable.schema";
import { Environment } from "@/simulator/compiler/environment/environment";
import { Language } from "@/simulator/compiler/lexer/language.enum";
import { Lexer } from "@/simulator/compiler/lexer/lexer";
import Parser from "@/simulator/compiler/parser/parser";
import SemanticAnalyserVisitor from "@/simulator/compiler/semantic-analyser/semantic-analyser.visitor";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Transition from "../../../schemas/grafcet/transition.schema";
import ProjectAnalyserIssue from "../../project.analyser.issue";
import ElementAnalyser, { ElementAnalyseIsolatedOptions } from "./element.analyser";

export default class TransitionAnalyser extends ElementAnalyser<Transition> {
	/**
	 * Rules that apply to the transition's own data, independently of the grafcet.
	 */
	analyseIsolated(
		transition: Transition,
		{ allowEmptyContent = false }: ElementAnalyseIsolatedOptions = {},
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-transition" as const, sourceId: transition.id };

		if (!transition.data.expression || transition.data.expression.trim() === "") {
			if (!allowEmptyContent) {
				issues.push(
					new ProjectAnalyserIssue(
						"error",
						source,
						"La transition n'a pas d'expression. Elle ne pourra jamais être franchie.",
					),
				);
			}
			return issues;
		}
		try {
			const lexer = new Lexer(Language.FR);
			const parser = new Parser(lexer.tokenize(transition.getFullExpression()));
			const node = parser.parse();
			if (
				node.type !== "IDENTIFIER" &&
				node.type !== "BOOLEAN_LITERAL" &&
				node.type !== "UNARY_EXPRESSION" &&
				node.type !== "LOGICAL_EXPRESSION" &&
				node.type !== "COMPARISON_EXPRESSION"
			) {
				if (node.type === "NUMBER_LITERAL") {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							source,
							"Une transition ne peut pas être une constante numérique. Si vous voulez qu'elle soit toujours validée, utilisez plutôt la constante booléenne TRUE.",
						),
					);
				} else {
					issues.push(
						new ProjectAnalyserIssue(
							"error",
							source,
							"Expression invalide. Une transition doit être une expression retournant un booléen.",
						),
					);
				}
			}
		} catch (e) {
			issues.push(
				new ProjectAnalyserIssue(
					"error",
					source,
					SimulatorExceptionsHelper.getUserFriendlyMessage(e, "FR"),
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
	): ProjectAnalyserIssue[] {
		const issues: ProjectAnalyserIssue[] = [];
		const source = { sourceType: "grafcet-transition" as const, sourceId: transition.id };

		if (!TransitionHelper.hasPredecessor(transition.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "La transition n'a aucun élément en amont."),
			);
		}

		if (!TransitionHelper.hasSuccessor(transition.id, grafcet)) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "La transition n'a aucun élément en aval."),
			);
		}
		if (transition.data.expression && transition.data.expression.trim() !== "") {
			try {
				const lexer = new Lexer(Language.FR);
				const parser = new Parser(lexer.tokenize(transition.getFullExpression()));
				const node = parser.parse();
				const semanticAnalyser = new SemanticAnalyserVisitor(
					new Environment(variables.map(VariablesMapper.schemaToEnv)),
				);
				semanticAnalyser.visit(node);
				if (node.type === "IDENTIFIER") {
					const variable = variables.find((v) => v.mnemonic === node.value);
					if (variable!.type !== "BOOL") {
						issues.push(
							new ProjectAnalyserIssue(
								"error",
								source,
								`La transition fait référence à la variable "${node.value}" qui n'est pas de type BOOL.`,
							),
						);
					}
				}
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
