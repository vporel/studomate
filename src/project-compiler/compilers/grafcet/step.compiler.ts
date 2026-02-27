import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Step from "../../../schemas/grafcet/step.schema";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import ControlsBuilder from "../../../simulator/compiler/ast/builders/controls.builder";
import ExpressionsBuilder from "../../../simulator/compiler/ast/builders/expressions.builder";
import IdentifiersBuilder from "../../../simulator/compiler/ast/builders/identifiers.builder";
import LiteralsBuilder from "../../../simulator/compiler/ast/builders/literals.builder";
import StatementsBuilder from "../../../simulator/compiler/ast/builders/statements.builder";
import { PLCVariable } from "../../../simulator/core/plc/plc";
import { PreCompiledGrafcet } from "../../../project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";
import { PreCompiledStep } from "../../../project-pre-compiler/pre-compilers/grafcet/step.pre-compiler";


export default class StepCompiler {

	static compile(
		stepId: string,
		preCompiledStep: PreCompiledStep,
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): ASTNode[] {
		const transitionNode = preCompiledGrafcet.transitions[preCompiledStep.transitionId].node;
		const stepsNodesBeforeTransition = preCompiledStep.stepsIdsBeforeTransition.map(stepId => preCompiledGrafcet.steps[stepId].node);
		const stepNode = preCompiledStep.node;
		return [
			//Memorize the step before assigning it, so we can use its previous value to detect rising/falling edges in actions
			StatementsBuilder.buildAssignStatementNode(stepMemosNodes.get(stepId)!, stepNode),
			ControlsBuilder.buildIfControlNode(
				//The transition is activated if its own condition is true AND all the steps before the transition are active (AND of all the steps before the transition)
				ExpressionsBuilder.buildChainedLogicalExpressionNode("AND", [transitionNode, ...stepsNodesBeforeTransition]), 
				[
					//Deactivate the steps before the transition
					...stepsNodesBeforeTransition.map(s => StatementsBuilder.buildAssignStatementNode(s, LiteralsBuilder.buildBooleanNode(false))),
					//Activate the step
					StatementsBuilder.buildAssignStatementNode(stepNode, LiteralsBuilder.buildBooleanNode(true)),
				],
				null
			)
		];
	}

}
