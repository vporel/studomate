import { PreCompiledGrafcet } from "../../../project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledStep } from "../../../project-pre-compiler/pre-compilers/grafcet/step.pre-compiler";
import ControlsBuilder from "../../../simulator/compiler/ast/builders/controls.builder";
import ExpressionsBuilder from "../../../simulator/compiler/ast/builders/expressions.builder";
import LiteralsBuilder from "../../../simulator/compiler/ast/builders/literals.builder";
import StatementsBuilder from "../../../simulator/compiler/ast/builders/statements.builder";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";

export default class StepCompiler {
	static compile(
		stepId: string,
		preCompiledStep: PreCompiledStep,
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): ASTNode[] {
		const stepNode = preCompiledStep.node;
		const branchesNodes = preCompiledStep.branches.map((branch) => {
			const transitionNode = preCompiledGrafcet.transitions.get(branch.transitionId)!.node;
			const stepsBeforeTransitionNodes = branch.stepsIdsBeforeTransition.map(
				(stepId) => stepMemosNodes.get(stepId)!,
			);
			return ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", [
				transitionNode,
				...stepsBeforeTransitionNodes,
			]);
		});
		const allBranchesStepsNodes = preCompiledStep.branches.flatMap((b) =>
			b.stepsIdsBeforeTransition.map((stepId) => preCompiledGrafcet.steps.get(stepId)!.node),
		);

		// OR divergence priority: the step activates only if no higher-priority branch is eligible.
		// For each prior branch, build its condition and negate it.
		const priorityExclusionNodes = preCompiledStep.orDivergencePriorityExclusions.map((excl) => {
			const transitionNode = preCompiledGrafcet.transitions.get(excl.transitionId)!.node;
			const stepsNodes = excl.stepsIdsBeforeTransition.map((sId) => stepMemosNodes.get(sId)!);
			const priorBranchCondition = ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", [
				transitionNode,
				...stepsNodes,
			]);
			return ExpressionsBuilder.buildUnaryExpressionNode("NOT", priorBranchCondition);
		});

		const baseCondition =
			branchesNodes.length === 1
				? branchesNodes[0]
				: ExpressionsBuilder.buildChainedLogicalExpressionNode("OR", branchesNodes);

		const activationCondition =
			priorityExclusionNodes.length === 0
				? baseCondition
				: ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", [
						baseCondition,
						...priorityExclusionNodes,
					]);

		return [
			ControlsBuilder.buildIfControlNode(
				activationCondition,
				[
					//Deactivate the steps in the branches
					...allBranchesStepsNodes.map((s) =>
						StatementsBuilder.buildAssignStatementNode(
							s,
							LiteralsBuilder.buildBooleanNode(false),
						),
					),
					//Activate the step
					StatementsBuilder.buildAssignStatementNode(
						stepNode,
						LiteralsBuilder.buildBooleanNode(true),
					),
				],
				null,
			),
		];
	}
}
