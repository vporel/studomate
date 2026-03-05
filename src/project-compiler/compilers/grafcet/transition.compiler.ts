import { PreCompiledGrafcet } from "../../../project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledTransition } from "../../../project-pre-compiler/pre-compilers/grafcet/transition.pre-compiler";
import ControlsBuilder from "../../../simulator/compiler/ast/builders/controls.builder";
import ExpressionsBuilder from "../../../simulator/compiler/ast/builders/expressions.builder";
import LiteralsBuilder from "../../../simulator/compiler/ast/builders/literals.builder";
import StatementsBuilder from "../../../simulator/compiler/ast/builders/statements.builder";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";

export default class TransitionCompiler {
	static compile(
		transitionId: string,
		preCompiledTransition: PreCompiledTransition,
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): ASTNode[] {
		const { node: transitionNode, predecessorStepsIds, successorStepsIds, orPriorityExclusionTransitionIds } =
			preCompiledTransition;

		// A transition with no upstream or downstream has no effect in this compilation unit
		// (can happen with step-referral-source pointing to another grafcet)
		if (predecessorStepsIds.length === 0 || successorStepsIds.length === 0) return [];

		// Predecessor steps: use MEMOS (values frozen before this cycle's activation pass)
		// This ensures a step activated earlier in the same cycle cannot immediately re-fire
		const predecessorMemoNodes = predecessorStepsIds.map((id) => {
			const memoNode = stepMemosNodes.get(id);
			if (!memoNode) throw new Error(`No memo node found for predecessor step ${id} on transition ${transitionId}`);
			return memoNode;
		});

		// OR priority exclusions: NOT(T_prior) using the cycle-current transition value
		// (transitions evaluate PLC signals directly, no memo concept applies)
		const priorityExclusionNodes = orPriorityExclusionTransitionIds.map((tId) => {
			const priorTransitionNode = preCompiledGrafcet.transitions.get(tId)?.node;
			if (!priorTransitionNode) throw new Error(`No pre-compiled node found for prior transition ${tId}`);
			return ExpressionsBuilder.buildUnaryExpressionNode("NOT", priorTransitionNode);
		});

		// Full activation condition: T AND memo(pred...) AND NOT(prior...)
		const conditionParts: ASTNode[] = [transitionNode, ...predecessorMemoNodes, ...priorityExclusionNodes];
		const activationCondition = this.buildAndCondition(conditionParts);

		// Deactivate predecessor steps (write to the live step node, not the memo)
		const deactivateNodes = predecessorStepsIds.map((id) => {
			const stepNode = preCompiledGrafcet.steps.get(id)?.node;
			if (!stepNode) throw new Error(`No pre-compiled node found for predecessor step ${id}`);
			return StatementsBuilder.buildAssignStatementNode(stepNode, LiteralsBuilder.buildBooleanNode(false));
		});

		// Activate successor steps
		const activateNodes = successorStepsIds.map((id) => {
			const stepNode = preCompiledGrafcet.steps.get(id)?.node;
			if (!stepNode) throw new Error(`No pre-compiled node found for successor step ${id}`);
			return StatementsBuilder.buildAssignStatementNode(stepNode, LiteralsBuilder.buildBooleanNode(true));
		});

		return [
			ControlsBuilder.buildIfControlNode(
				activationCondition,
				[...deactivateNodes, ...activateNodes],
				null,
			),
		];
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
