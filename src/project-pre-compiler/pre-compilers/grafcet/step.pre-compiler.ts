import StepHelper from "@/schemas/grafcet/helpers/step.helper";
import StepVariableGenerator from "../../../project-analyser/analysers/grafcet/step-variable.generator";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Step from "../../../schemas/grafcet/step.schema";
import IdentifiersBuilder from "../../../simulator/compiler/ast/builders/identifiers.builder";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";

/**
 * A scenario that can activate the step
 * The step will be activated if at least one of the scenarios is active (OR logic)
 * In a scenario, the transition and all the steps must be active at the same time (AND logic)
 */
export type PreCompiledStepBranch = {
	transitionId: string;
	stepsIdsBeforeTransition: string[];
};

export type PreCompiledStep = {
	node: IdentifierNode;
	initial: boolean;
	/**
	 * The scenarios that can activate the step
	 * The step will be activated if at least one of the scenarios is active (OR logic)
	 * In a scenario, the transition and all the steps must be active at the same time (AND logic)
	 */
	branches: PreCompiledStepBranch[];
};

export default class StepPreCompiler {
	static preCompile(step: Step, grafcet: Grafcet): PreCompiledStep {
		const node = IdentifiersBuilder.buildIdentifierNode(
			StepVariableGenerator.stepVariableMnemonic(step.data.number as number),
			0,
		);

		return {
			node,
			initial: step.data.initial === true,
			branches: StepHelper.getPredecessorBranches(step.id, grafcet).map((branch) => ({
				transitionId: branch.transition.id,
				stepsIdsBeforeTransition: branch.stepsBeforeTransition.map((s) => s.id),
			})),
		};
	}
}
