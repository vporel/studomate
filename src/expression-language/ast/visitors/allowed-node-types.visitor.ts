import { ASTNode } from "../nodes/ast-node";
import {
	CounterNode,
	TimerNode,
	TimerStringDeclarationNode,
} from "../nodes/blocks";
import { IfControlNode } from "../nodes/controls";
import {
	ArithmeticExpressionNode,
	ComparisonExpressionNode,
	LogicalExpressionNode,
	UnaryExpressionNode,
} from "../nodes/expressions";
import { IdentifierNode } from "../nodes/identifiers";
import { BooleanNode, NumberNode, StringNode } from "../nodes/literals";
import { AssignStatementNode } from "../nodes/statements";
import { BaseVisitor } from "./base.visitor";

/**
 * Repère tous les nœuds d'un arbre dont le type n'appartient pas à `allowedTypes` — liste
 * blanche plutôt que noire : un type de nœud ajouté plus tard au langage est exclu par défaut
 * tant qu'il n'est pas explicitement ajouté par chaque appelant, jamais silencieusement autorisé.
 * Utile pour restreindre une expression à un sous-ensemble de la grammaire (voir
 * `CompareBlockAnalyser` : arithmétique/comparaison uniquement).
 */
export default class AllowedNodeTypesVisitor extends BaseVisitor<ASTNode[]> {
	private allowedTypes: Set<ASTNode["type"]>;

	constructor(allowedTypes: ASTNode["type"][]) {
		super();
		this.allowedTypes = new Set(allowedTypes);
	}

	private checkSelf(node: ASTNode): ASTNode[] {
		return this.allowedTypes.has(node.type) ? [] : [node];
	}

	protected visitIdentifierNode(node: IdentifierNode): ASTNode[] {
		return this.checkSelf(node);
	}

	protected visitBooleanNode(node: BooleanNode): ASTNode[] {
		return this.checkSelf(node);
	}

	protected visitNumberNode(node: NumberNode): ASTNode[] {
		return this.checkSelf(node);
	}

	protected visitStringNode(node: StringNode): ASTNode[] {
		return this.checkSelf(node);
	}

	protected visitUnaryExpressionNode(node: UnaryExpressionNode): ASTNode[] {
		return this.visit(node.expr).concat(this.checkSelf(node));
	}

	protected visitArithmeticExpressionNode(
		node: ArithmeticExpressionNode,
	): ASTNode[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(this.checkSelf(node));
	}

	protected visitComparisonExpressionNode(
		node: ComparisonExpressionNode,
	): ASTNode[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(this.checkSelf(node));
	}

	protected visitLogicalExpressionNode(node: LogicalExpressionNode): ASTNode[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(this.checkSelf(node));
	}

	protected visitAssignStatementNode(node: AssignStatementNode): ASTNode[] {
		return this.visit(node.left)
			.concat(this.visit(node.right))
			.concat(this.checkSelf(node));
	}

	protected visitIfControlNode(node: IfControlNode): ASTNode[] {
		return this.visit(node.condition)
			.concat(node.trueBranch.flatMap((n) => this.visit(n)))
			.concat(
				node.falseBranch ? node.falseBranch.flatMap((n) => this.visit(n)) : [],
			)
			.concat(this.checkSelf(node));
	}

	protected visitTimerBlockNode(node: TimerNode): ASTNode[] {
		return this.visit(node.input)
			.concat(this.visit(node.lastInput))
			.concat(this.visit(node.presetTime))
			.concat(this.visit(node.elapsedTime))
			.concat(this.visit(node.output))
			.concat(this.checkSelf(node));
	}

	protected visitTimerStringDeclarationNode(
		node: TimerStringDeclarationNode,
	): ASTNode[] {
		return this.visit(node.input).concat(this.checkSelf(node));
	}

	protected visitCounterBlockNode(node: CounterNode): ASTNode[] {
		return this.visit(node.input)
			.concat(this.visit(node.control))
			.concat(this.visit(node.presetValue))
			.concat(this.visit(node.currentValue))
			.concat(this.visit(node.output))
			.concat(this.checkSelf(node));
	}
}
