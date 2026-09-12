import { PreCompiledAction } from "@/project-pre-compiler/pre-compilers/grafcet/action.pre-compiler";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";

export default class ActionCompiler {
	static compile(
		actionId: string,
		preCompiledAction: PreCompiledAction,
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): ASTNode[] {
		const nodes: ASTNode[] = [];
		const stepNode = preCompiledGrafcet.steps.get(
			preCompiledAction.stepId,
		)!.node;

		const phases = preCompiledAction.phases;
		const risingEdgeCondition = ExpressionsBuilder.buildLogicalExpressionNode(
			"AND",
			ExpressionsBuilder.buildUnaryExpressionNode(
				"NOT",
				stepMemosNodes.get(preCompiledAction.stepId)!,
			), //Previous value of the step is false
			stepNode, //Current value of the step is true
		);
		const fallingEdgeCondition = ExpressionsBuilder.buildLogicalExpressionNode(
			"AND",
			stepMemosNodes.get(preCompiledAction.stepId)!, //Previous value of the step is true
			ExpressionsBuilder.buildUnaryExpressionNode("NOT", stepNode), //Current value of the step is false
		);
		const continuousCondition = stepNode; //Current value of the step is true
		if (phases.onActivation) {
			nodes.push(
				ControlsBuilder.buildIfControlNode(
					risingEdgeCondition,
					phases.onActivation,
					null,
				),
			);
		}
		if (phases.onDeactivation) {
			nodes.push(
				ControlsBuilder.buildIfControlNode(
					fallingEdgeCondition,
					phases.onDeactivation,
					null,
				),
			);
		}
		if (phases.continuous) {
			nodes.push(
				ControlsBuilder.buildIfControlNode(
					continuousCondition,
					phases.continuous,
					null,
				),
			);
		}
		return nodes;
	}
}
