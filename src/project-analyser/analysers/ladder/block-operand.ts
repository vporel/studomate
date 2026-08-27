import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import ProjectAnalyserIssue, {
	ProjectAnalyserIssueCode,
	ProjectAnalyserIssueSource,
} from "@/project-analyser/project.analyser.issue";

/** Un opérande de pinoche (compare IN1/IN2, assign/arithmetic IN…) : identifiant ou littéral,
 * jamais une expression composée. */
export const OPERAND_NODE_TYPES: ASTNode["type"][] = [
	"IDENTIFIER",
	"BOOLEAN_LITERAL",
	"NUMBER_LITERAL",
	"STRING_LITERAL",
];

/**
 * Parse `raw` et renvoie son AST si sa racine est de l'un des types autorisés, sinon `null`.
 * Lève si `raw` n'est pas une expression valide (l'appelant attrape et mappe en message).
 */
export function parseOperandNode(
	raw: string,
	dialect: Dialect,
	allowed: ASTNode["type"][],
): ASTNode | null {
	const { ast } = parseExpressionCached(raw, dialect);
	return allowed.includes(ast.type) ? ast : null;
}

/** Renvoie le nœud identifiant si `raw` est un simple mnémonique, sinon `null`. */
export function parseIdentifierNode(
	raw: string,
	dialect: Dialect,
): ASTNode | null {
	const { ast } = parseExpressionCached(raw, dialect);
	return ast.type === "IDENTIFIER" ? ast : null;
}

export function issue(
	code: ProjectAnalyserIssueCode,
	source: ProjectAnalyserIssueSource,
	message: string,
): ProjectAnalyserIssue {
	return new ProjectAnalyserIssue("error", code, source, message);
}
