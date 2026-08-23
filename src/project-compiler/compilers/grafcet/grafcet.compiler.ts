import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import ActionCompiler from "./action.compiler";
import TransitionCompiler from "./transition.compiler";

export type CompiledGrafcet = {
	nodes: ASTNode[];
	timers: TimerNode[];
};

export default class GrafcetCompiler {
	static compile(preCompiledGrafcet: PreCompiledGrafcet): CompiledGrafcet {
		const stepMemosNodes = new Map(
			Array.from(preCompiledGrafcet.stepsMemos.entries()).map(([stepId, { node }]) => [stepId, node]),
		);

		const nodes: ASTNode[] = [
			//Compile transitions: each transition generates its activation/deactivation block
			...Array.from(preCompiledGrafcet.transitions.entries()).flatMap(
				([transitionId, preCompiledTransition]) =>
					TransitionCompiler.compile(transitionId, preCompiledTransition, preCompiledGrafcet, stepMemosNodes),
			),
			//Compile actions
			...Array.from(preCompiledGrafcet.actions.entries())
				.filter(([, preCompiledAction]) => !!preCompiledAction) //Filter out TEXT actions, or actions with no expression
				.flatMap(([actionId, preCompiledAction]) =>
					ActionCompiler.compile(actionId, preCompiledAction!, preCompiledGrafcet, stepMemosNodes),
				),
			//Memorizations of steps
			...Array.from(preCompiledGrafcet.steps.entries()).map(([stepId, preCompiledStep]) =>
				//For each step, create a memo variable that stores its previous value before it gets updated in the step compiler. This allows actions to detect rising/falling edges on steps by comparing the current value of the step with its previous value stored in the memo variable.
				StatementsBuilder.buildAssignStatementNode(stepMemosNodes.get(stepId)!, preCompiledStep.node),
			),
			//If no step is active at the beginning, activate the initial step(s)
			...this.initializeSteps(preCompiledGrafcet),
		];

		return {
			nodes,
			timers: Array.from(preCompiledGrafcet.transitions.values()).flatMap((t) => t.timers),
		};
	}

	private static initializeSteps(preCompiledGrafcet: PreCompiledGrafcet): ASTNode[] {
		const initialSteps = Array.from(preCompiledGrafcet.steps.values()).filter((s) => s.initial);
		if (initialSteps.length !== 1) throw new Error("Grafcet must have exactly one initial step.");
		const initialStep = initialSteps[0];
		const otherSteps = Array.from(preCompiledGrafcet.steps.values()).filter((s) => s !== initialStep);
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
