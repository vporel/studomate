import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { TimerStringDeclarationNode } from "@/expression-language/ast/nodes/blocks";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import FinderVisitor from "@/expression-language/ast/visitors/finder.visitor";
import { Dialect } from "@/expression-language/dialect.enum";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";

/** Identifiants lus / écrits par une expression, dédupliqués. */
export type ExpressionRefs = { reads: string[]; writes: string[] };

/** Si `raw` est un simple mnémonique, renvoie son nom ; sinon (littéral, expression composée,
 * expression invalide, chaîne vide) renvoie `null`. Ne lève jamais. */
export function identifierName(raw: string, dialect: Dialect): string | null {
	if (!raw || raw.trim() === "") return null;
	try {
		const { ast } = parseExpressionCached(raw, dialect);
		return ast.type === "IDENTIFIER" ? (ast as IdentifierNode).value : null;
	} catch {
		return null;
	}
}

function identifiersIn(node: ASTNode): string[] {
	return new FinderVisitor<IdentifierNode>("IDENTIFIER")
		.visit(node)
		.map((identifier) => identifier.value);
}

function timerDeclarationNames(node: ASTNode): string[] {
	return new FinderVisitor<TimerStringDeclarationNode>("TIMER_STRING_DECLARATION")
		.visit(node)
		.map((declaration) => declaration.name);
}

/**
 * Lecture/écriture d'une expression de réceptivité ou d'action grafcet.
 *
 * Pour un `ASSIGN_STATEMENT` (`X := …`), la cible (`left`) est une écriture et seuls les
 * identifiants de `right` sont des lectures — `FinderVisitor("IDENTIFIER")` sur le nœud entier
 * remonterait aussi la cible. Une cible qui se relit elle-même (`X := X + 1`) apparaît donc à la
 * fois en lecture et en écriture, ce qui est correct. Un `TIMER_STRING_DECLARATION` (`t1/X1/5s`)
 * déclare un timer : son nom est une écriture, son entrée est déjà couverte par la recherche
 * d'identifiants.
 *
 * Ne lève jamais : une expression invalide ne produit aucune référence.
 */
export function expressionRefs(raw: string, dialect: Dialect): ExpressionRefs {
	if (!raw || raw.trim() === "") return { reads: [], writes: [] };
	let ast: ASTNode;
	try {
		ast = parseExpressionCached(raw, dialect).ast;
	} catch {
		return { reads: [], writes: [] };
	}

	const writes = new Set<string>(timerDeclarationNames(ast));
	const reads = new Set<string>();

	if (ast.type === "ASSIGN_STATEMENT") {
		if (ast.left.type === "IDENTIFIER") writes.add((ast.left as IdentifierNode).value);
		identifiersIn(ast.right).forEach((name) => reads.add(name));
	} else {
		identifiersIn(ast).forEach((name) => reads.add(name));
	}

	return { reads: [...reads], writes: [...writes] };
}
