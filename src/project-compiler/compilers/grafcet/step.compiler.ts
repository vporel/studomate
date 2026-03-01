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
				(stepId) => preCompiledGrafcet.steps.get(stepId)!.node,
			);
			return ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", [
				transitionNode,
				...stepsBeforeTransitionNodes,
			]);
		});
		const allBranchesStepsNodes = preCompiledStep.branches.flatMap((b) =>
			b.stepsIdsBeforeTransition.map((stepId) => preCompiledGrafcet.steps.get(stepId)!.node),
		);

		return [
			ControlsBuilder.buildIfControlNode(
				branchesNodes.length === 1
					? branchesNodes[0]
					: ExpressionsBuilder.buildChainedLogicalExpressionNode("OR", branchesNodes),
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
