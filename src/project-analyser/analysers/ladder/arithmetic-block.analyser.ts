import SchemaVariablesMapper from "@/bridge/variables.mapper";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import {
	ARITHMETIC_BLOCK_OPERATORS,
	BlockElement,
} from "@/schemas/ladder/block.schema";
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
 * Validation propre à un bloc `"arithmetic"` — voir `ArithmeticBlockParams`. `in1`/`in2` sont des
 * opérandes simples, `out` un mnémonique de variable. Le contrôle « `out` déclarée, inscriptible,
 * numérique, et opérandes numériques » est délégué à `SemanticAnalyserVisitor` sur l'AST
 * `out := in1 <op> in2`.
 */
export default class ArithmeticBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "arithmetic") return [];
		const { in1, in2, out, operator } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [];
		if (!in1 || in1.trim() === "")
			issues.push(issue("BLOCK_ARITHMETIC_IN1_EMPTY", source));
		if (!in2 || in2.trim() === "")
			issues.push(issue("BLOCK_ARITHMETIC_IN2_EMPTY", source));
		if (!out || out.trim() === "")
			issues.push(issue("BLOCK_ARITHMETIC_OUT_EMPTY", source));
		if (!ARITHMETIC_BLOCK_OPERATORS.includes(operator))
			issues.push(
				issue("BLOCK_ARITHMETIC_OPERATOR_INVALID", source, { operator }),
			);
		if (issues.length > 0) return issues;

		try {
			const target = parseIdentifierNode(out, dialect);
			if (!target)
				return [issue("BLOCK_ARITHMETIC_OUT_NOT_A_VARIABLE", source)];

			const left = parseOperandNode(in1, dialect, OPERAND_NODE_TYPES);
			const right = parseOperandNode(in2, dialect, OPERAND_NODE_TYPES);
			if (!left || !right)
				return [issue("BLOCK_ARITHMETIC_INPUT_NOT_ALLOWED", source)];

			const env = new Environment(
				Array.from(variablesByMnemonic.values()).map(
					SchemaVariablesMapper.schemaToEnv,
				),
			);
			new SemanticAnalyserVisitor(env).visit(
				StatementsBuilder.buildAssignStatementNode(
					target,
					ExpressionsBuilder.buildArithmeticExpressionNode(
						operator,
						left,
						right,
					),
				),
			);
		} catch (e) {
			return [
				new ProjectAnalyserIssue(
					"error",
					"BLOCK_ARITHMETIC_INVALID",
					source,
					{},
					e,
				),
			];
		}

		return issues;
	}
}
