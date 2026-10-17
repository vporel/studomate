import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { isConvertibleType } from "@/expression-language/conversions";
import { Dialect } from "@/expression-language/dialect.enum";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement } from "@/schemas/ladder/block.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import { issue, parseIdentifierNode } from "./block-operand";

/**
 * Validation of a `"convert"` block (see `ConvertBlockParams`). `in` and `out` must be variable
 * mnemonics; `out` must have a convertible numeric type, which is the conversion's target. The
 * checks on the conversion itself (supported pair of types, writable `out`) are delegated to
 * `SemanticAnalyserVisitor` on the AST `out := <conversion>(in)`.
 */
export default class ConvertBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		environment: Environment,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "convert") return [];
		const { in: inRaw, out: outRaw } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [];
		if (!inRaw || inRaw.trim() === "")
			issues.push(issue("BLOCK_CONVERT_IN_EMPTY", source));
		if (!outRaw || outRaw.trim() === "")
			issues.push(issue("BLOCK_CONVERT_OUT_EMPTY", source));
		if (issues.length > 0) return issues;

		try {
			const target = parseIdentifierNode(outRaw, dialect);
			if (!target) return [issue("BLOCK_CONVERT_OUT_NOT_A_VARIABLE", source)];
			const value = parseIdentifierNode(inRaw, dialect);
			if (!value) return [issue("BLOCK_CONVERT_IN_NOT_A_VARIABLE", source)];

			const analyser = new SemanticAnalyserVisitor(environment);
			analyser.visit(target);
			analyser.visit(value);

			const outName = outRaw.trim();
			const targetType = environment.getVariableDeclaredTypeByName(outName);
			if (!targetType || !isConvertibleType(targetType))
				return [
					issue("BLOCK_CONVERT_OUT_INVALID_TYPE", source, {
						variableName: outName,
					}),
				];

			analyser.visit(
				StatementsBuilder.buildAssignStatementNode(
					target,
					ExpressionsBuilder.buildConversionExpressionNode(
						null,
						targetType,
						value,
					),
				),
			);
		} catch (e) {
			return [
				new ProjectAnalyserIssue("error", "BLOCK_CONVERT_INVALID", source, {}, e),
			];
		}

		return issues;
	}
}
