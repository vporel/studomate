import SimulatorExceptionsMapper from "@/bridge/simulator-exceptions.mapper";
import SchemaVariablesMapper from "@/bridge/variables.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import AllowedNodeTypesVisitor from "@/expression-language/ast/visitors/allowed-node-types.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueCode,
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";
import { BlockElement, COMPARE_OPERATORS } from "@/schemas/ladder/block.schema";
import Variable from "@/schemas/variable/variable.schema";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";

/** Une pinoche IN1/IN2 d'un bloc compare est un opérande simple : un identifiant, un littéral, ou
 * au plus une expression arithmétique. Jamais de comparaison imbriquée, d'opérateur logique ni
 * d'affectation — liste blanche (voir `AllowedNodeTypesVisitor`). */
const ALLOWED_OPERAND_NODE_TYPES: ASTNode["type"][] = [
	"IDENTIFIER",
	"BOOLEAN_LITERAL",
	"NUMBER_LITERAL",
	"STRING_LITERAL",
	"ARITHMETIC_EXPRESSION",
];

/**
 * Validation propre à un bloc `"compare"` — voir `CompareBlockParams`. Les deux pinoches IN1/IN2
 * sont lexées/parsées comme des opérandes, puis combinées en `IN1 <operator> IN2` et passées à
 * `SemanticAnalyserVisitor`, qui garantit déjà : identifiants déclarés, opérandes de même type,
 * et opérandes numériques pour `<`/`<=`/`>`/`>=`. Appelé par `BlockAnalyser`, qui dispatche par
 * `blockType`.
 */
export default class CompareBlockAnalyser {
	static analyse(
		element: BlockElement,
		source: ProjectAnalyserIssueSource,
		dialect: Dialect,
		variablesByMnemonic: Map<string, Variable>,
	): ProjectAnalyserIssue[] {
		if (element.data.blockType !== "compare") return [];
		const { in1, in2, operator } = element.data.params;

		const issues: ProjectAnalyserIssue[] = [];
		if (!in1 || in1.trim() === "")
			issues.push(
				this.issue(
					"BLOCK_COMPARE_IN1_EMPTY",
					source,
					"La pinoche IN1 de ce bloc de comparaison doit être renseignée.",
				),
			);
		if (!in2 || in2.trim() === "")
			issues.push(
				this.issue(
					"BLOCK_COMPARE_IN2_EMPTY",
					source,
					"La pinoche IN2 de ce bloc de comparaison doit être renseignée.",
				),
			);
		if (!COMPARE_OPERATORS.includes(operator))
			issues.push(
				this.issue(
					"BLOCK_COMPARE_OPERATOR_INVALID",
					source,
					`"${operator}" n'est pas un opérateur de comparaison valide.`,
				),
			);
		if (issues.length > 0) return issues;

		try {
			const left = this.parseOperand(in1, dialect, "IN1", source, issues);
			const right = this.parseOperand(in2, dialect, "IN2", source, issues);
			if (issues.length > 0 || !left || !right) return issues;

			const comparison = ExpressionsBuilder.buildComparisonExpressionNode(
				operator,
				left,
				right,
			);
			const env = new Environment(
				Array.from(variablesByMnemonic.values()).map(
					SchemaVariablesMapper.schemaToEnv,
				),
			);
			new SemanticAnalyserVisitor(env).visit(comparison);
		} catch (e) {
			return [
				this.issue(
					"BLOCK_COMPARE_INVALID_EXPRESSION",
					source,
					SimulatorExceptionsMapper.getUserFriendlyMessage(e, "FR"),
				),
			];
		}

		return issues;
	}

	private static parseOperand(
		raw: string,
		dialect: Dialect,
		pinName: "IN1" | "IN2",
		source: ProjectAnalyserIssueSource,
		issues: ProjectAnalyserIssue[],
	): ASTNode | null {
		const { ast } = parseExpressionCached(raw, dialect);
		if (new AllowedNodeTypesVisitor(ALLOWED_OPERAND_NODE_TYPES).visit(ast)[0]) {
			issues.push(
				this.issue(
					"BLOCK_COMPARE_INPUT_NOT_ALLOWED",
					source,
					`La pinoche ${pinName} doit contenir une variable ou une valeur, pas une expression complexe.`,
				),
			);
			return null;
		}
		return ast;
	}

	private static issue(
		code: ProjectAnalyserIssueCode,
		source: ProjectAnalyserIssueSource,
		message: string,
	): ProjectAnalyserIssue {
		return new ProjectAnalyserIssue("error", code, source, message);
	}
}
