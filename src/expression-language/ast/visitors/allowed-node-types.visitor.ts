import { ASTNode } from "../nodes/ast-node";
import AbstractCollectorVisitor from "./abstract-collector.visitor";

/**
 * Repère tous les nœuds d'un arbre dont le type n'appartient pas à `allowedTypes` — liste
 * blanche plutôt que noire : un type de nœud ajouté plus tard au langage est exclu par défaut
 * tant qu'il n'est pas explicitement ajouté par chaque appelant, jamais silencieusement autorisé.
 * Utile pour restreindre une expression à un sous-ensemble de la grammaire (voir
 * `CompareBlockAnalyser` : arithmétique/comparaison uniquement).
 */
export default class AllowedNodeTypesVisitor extends AbstractCollectorVisitor {
	private allowedTypes: Set<ASTNode["type"]>;

	constructor(allowedTypes: ASTNode["type"][]) {
		super();
		this.allowedTypes = new Set(allowedTypes);
	}

	protected matches(node: ASTNode): boolean {
		return !this.allowedTypes.has(node.type);
	}
}
