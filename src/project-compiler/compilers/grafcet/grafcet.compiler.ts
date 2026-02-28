import ControlsBuilder from "@/simulator/compiler/ast/builders/controls.builder";
import ExpressionsBuilder from "@/simulator/compiler/ast/builders/expressions.builder";
import LiteralsBuilder from "@/simulator/compiler/ast/builders/literals.builder";
import StatementsBuilder from "@/simulator/compiler/ast/builders/statements.builder";
import { PreCompiledGrafcet } from "../../../project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";
import ActionCompiler from "./action.compiler";
import StepCompiler from "./step.compiler";

export default class GrafcetCompiler {
	static compile(
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): ASTNode[] {
		return [
			//Compile steps first, so actions can reference the step nodes to detect rising/falling edges
			...Object.entries(preCompiledGrafcet.steps).flatMap(([stepId, preCompiledStep]) =>
				StepCompiler.compile(stepId, preCompiledStep, preCompiledGrafcet, stepMemosNodes),
			),
			//Compile actions
			...Object.entries(preCompiledGrafcet.actions)
				.filter(([_, preCompiledAction]) => !!preCompiledAction) //Filter out TEXT actions, or actions with no expression
				.flatMap(([actionId, preCompiledAction]) =>
					ActionCompiler.compile(actionId, preCompiledAction!, preCompiledGrafcet, stepMemosNodes),
				),
			//Memorizations of steps
			...Object.entries(preCompiledGrafcet.steps).map(([stepId, preCompiledStep]) =>
				//For each step, create a memo variable that stores its previous value before it gets updated in the step compiler. This allows actions to detect rising/falling edges on steps by comparing the current value of the step with its previous value stored in the memo variable.
				StatementsBuilder.buildAssignStatementNode(stepMemosNodes.get(stepId)!, preCompiledStep.node),
			),
			//If no step is active at the beginning, activate the initial step(s)
			...this.initializeSteps(preCompiledGrafcet),
		];
	}

	private static initializeSteps(preCompiledGrafcet: PreCompiledGrafcet): ASTNode[] {
		const initialSteps = Object.values(preCompiledGrafcet.steps).filter((s) => s.initial);
		if (initialSteps.length !== 1) throw new Error("Grafcet must have exactly one initial step.");
		const initialStep = initialSteps[0];
		const otherSteps = Object.values(preCompiledGrafcet.steps).filter((s) => s !== initialStep);
		if (otherSteps.length === 0) throw new Error("Grafcet must have at least 2 steps.");
		return [
			ControlsBuilder.buildIfControlNode(
				otherSteps.length === 1
					? ExpressionsBuilder.buildUnaryExpressionNode("NOT", otherSteps[0].node)
					: ExpressionsBuilder.buildChainedLogicalExpressionNode(
							"AND",
							otherSteps.map((s) => ExpressionsBuilder.buildUnaryExpressionNode("NOT", s.node)),
						),
				[
					StatementsBuilder.buildAssignStatementNode(
						initialStep.node,
						LiteralsBuilder.buildBooleanNode(true),
					),
				],
				null,
			),
		];
	}
}
