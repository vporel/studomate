import SchemaVariablesMapper from "@/bridge/variables.mapper";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import {
	OPERAND_NODE_TYPES,
	issue,
	parseIdentifierNode,
	parseOperandNode,
} from "./block-operand";

/**
 * Validation propre à un bloc `"assign"` — voir `AssignBlockParams`. `out` doit être un
 * mnémonique de variable (pas un littéral, pas une expression), `in` un opérande simple
 * (identifiant ou littéral). Le contrôle « `out` est déclarée, inscriptible, et de type
 * compatible avec `in` » est délégué à `SemanticAnalyserVisitor` sur l'AST `out := in`.
 */
export default class AssignBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "assign") return [];
		const { in: inRaw, out: outRaw } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [];
		if (!inRaw || inRaw.trim() === "")
			issues.push(issue("BLOCK_ASSIGN_IN_EMPTY", source));
		if (!outRaw || outRaw.trim() === "")
			issues.push(issue("BLOCK_ASSIGN_OUT_EMPTY", source));
		if (issues.length > 0) return issues;

		try {
			const target = parseIdentifierNode(outRaw, dialect);
			if (!target) return [issue("BLOCK_ASSIGN_OUT_NOT_A_VARIABLE", source)];

			const value = parseOperandNode(inRaw, dialect, OPERAND_NODE_TYPES);
			if (!value) return [issue("BLOCK_ASSIGN_IN_NOT_ALLOWED", source)];

			const env = new Environment(
				Array.from(variablesByMnemonic.values()).map(
					SchemaVariablesMapper.schemaToEnv,
				),
			);
			new SemanticAnalyserVisitor(env).visit(
				StatementsBuilder.buildAssignStatementNode(target, value),
			);
		} catch (e) {
			return [
				new ProjectAnalyserIssue("error", "BLOCK_ASSIGN_INVALID", source, {}, e),
			];
		}

		return issues;
	}
}
