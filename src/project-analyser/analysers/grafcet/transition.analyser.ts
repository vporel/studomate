import SimulatorExceptionsHelper from "@/bridge/simulator-exceptions.helper";
import VariablesMapper from "@/bridge/variables.mapper";
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

const UPSTREAM_TYPES = new Set(["step", "junction-or-start", "junction-and-end"]);
const DOWNSTREAM_TYPES = new Set(["step", "junction-or-end", "junction-and-start", "step-referral-source"]);

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
			const parser = new Parser(lexer.tokenize(transition.data.expression));
			parser.parse();
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

		const hasUpstream = grafcet.connections.some(
			(c) => c.target.id === transition.id && UPSTREAM_TYPES.has(c.source.type),
		);
		const hasDownstream = grafcet.connections.some(
			(c) => c.source.id === transition.id && DOWNSTREAM_TYPES.has(c.target.type),
		);

		if (!hasUpstream) {
			issues.push(
				new ProjectAnalyserIssue("error", source, "La transition n'a aucune étape en amont."),
			);
		}
		if (!hasDownstream) {
			issues.push(new ProjectAnalyserIssue("error", source, "La transition n'a aucune étape en aval."));
		}

		try {
			const lexer = new Lexer(Language.FR);
			const parser = new Parser(lexer.tokenize(transition.data.expression));
			const semanticAnalyser = new SemanticAnalyserVisitor(
				new Environment(variables.map(VariablesMapper.schemaToEnv)),
			);
			semanticAnalyser.visit(parser.parse());
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
}
