import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledTransition } from "@/project-pre-compiler/pre-compilers/grafcet/transition.pre-compiler";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";

export type CompiledTransition = {
	/** Assignment of the firing condition to the transition's fired variable, if it has one. */
	fired: ASTNode | null;
	/** Guarded deactivation of the upstream steps. */
	deactivation: ASTNode[];
	/** Guarded activation of the downstream steps. */
	activation: ASTNode[];
};

/**
 * Compiles a transition into the evaluation of its firing condition into a fired variable and
 * two blocks guarded by that variable. The caller runs every fired assignment, then every
 * deactivation, then every activation: a step that is deactivated by one transition and
 * activated by another in the same cycle ends active, whatever the order of the transitions.
 */
export default class TransitionCompiler {
	static compile(
		transitionId: string,
		preCompiledTransition: PreCompiledTransition,
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): CompiledTransition {
		const {
			pureNode: transitionNode,
			predecessorStepsIds,
			successorStepsIds,
			orPriorityExclusionTransitionIds,
		} = preCompiledTransition;

		// A transition with no upstream or downstream has no effect in this compilation unit
		// (can happen with step-referral-source pointing to another grafcet)
		if (predecessorStepsIds.length === 0 || successorStepsIds.length === 0)
			return { fired: null, deactivation: [], activation: [] };

		const firedNode = preCompiledGrafcet.firedVariables.get(transitionId)?.node;
		if (!firedNode)
			throw new Error(`No fired variable found for transition ${transitionId}`);

		// Predecessor steps: use MEMOS (values frozen before this cycle's activation pass)
		// This ensures a step activated earlier in the same cycle cannot immediately re-fire
		const predecessorMemoNodes = predecessorStepsIds.map((id) => {
			const memoNode = stepMemosNodes.get(id);
			if (!memoNode)
				throw new Error(
					`No memo node found for predecessor step ${id} on transition ${transitionId}`,
				);
			return memoNode;
		});

		// OR priority exclusions: NOT(T_prior) using the prior transition's pure receptivity
		// node (timers already advanced once this cycle, see GrafcetCompiler) — evaluating the
		// raw node here would double-step its timers.
		const priorityExclusionNodes = orPriorityExclusionTransitionIds.map(
			(tId) => {
				const priorTransitionNode =
					preCompiledGrafcet.transitions.get(tId)?.pureNode;
				if (!priorTransitionNode)
					throw new Error(
						`No pre-compiled node found for prior transition ${tId}`,
					);
				return ExpressionsBuilder.buildUnaryExpressionNode(
					"NOT",
					priorTransitionNode,
				);
			},
		);

		// Full activation condition: T AND memo(pred...) AND NOT(prior...)
		const conditionParts: ASTNode[] = [
			transitionNode,
			...predecessorMemoNodes,
			...priorityExclusionNodes,
		];
		const activationCondition = new SimplifierVisitor().visit(
			this.buildAndCondition(conditionParts),
		);

		// Deactivate predecessor steps (write to the live step node, not the memo)
		const deactivateNodes = predecessorStepsIds.map((id) => {
			const stepNode = preCompiledGrafcet.steps.get(id)?.node;
			if (!stepNode)
				throw new Error(
					`No pre-compiled node found for predecessor step ${id}`,
				);
			return StatementsBuilder.buildAssignStatementNode(
				stepNode,
				LiteralsBuilder.buildBooleanNode(false),
			);
		});

		// Activate successor steps
		const activateNodes = successorStepsIds.map((id) => {
			const stepNode = preCompiledGrafcet.steps.get(id)?.node;
			if (!stepNode)
				throw new Error(`No pre-compiled node found for successor step ${id}`);
			return StatementsBuilder.buildAssignStatementNode(
				stepNode,
				LiteralsBuilder.buildBooleanNode(true),
			);
		});

		return {
			fired: StatementsBuilder.buildAssignStatementNode(
				firedNode,
				activationCondition,
			),
			deactivation: [
				ControlsBuilder.buildIfControlNode(
					firedNode,
					deactivateNodes,
					null,
				),
			],
			activation: [
				ControlsBuilder.buildIfControlNode(
					firedNode,
					activateNodes,
					null,
				),
			],
		};
	}

	/**
	 * Builds an AND condition from a list of nodes.
	 * Returns the single node unchanged if only one is provided.
	 * Uses buildChainedLogicalExpressionNode for 2+ nodes.
	 */
	private static buildAndCondition(nodes: ASTNode[]): ASTNode {
		if (nodes.length === 1) return nodes[0];
		return ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", nodes);
	}
}
