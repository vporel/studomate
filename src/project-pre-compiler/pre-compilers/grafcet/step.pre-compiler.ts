import StepVariableGenerator from "../../../project-analyser/analysers/grafcet/step-variable.generator";
import { GRAFCET_JUNCTION_AND_END_TYPE, GRAFCET_STEP_TYPE } from "../../../schemas/grafcet/element.schema";
import Grafcet from "../../../schemas/grafcet/grafcet.schema";
import Step, { GRAFCET_STEP_HANDLES } from "../../../schemas/grafcet/step.schema";
import { GRAFCET_TRANSITION_HANDLES } from "../../../schemas/grafcet/transition.schema";
import IdentifiersBuilder from "../../../simulator/compiler/ast/builders/identifiers.builder";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";

export type PreCompiledStep = {
	node: IdentifierNode;
	transitionId: string; //The id of the single upstream transition that can activate this step
	stepsIdsBeforeTransition: string[];
};

export default class StepPreCompiler {
	/**
	 * Compiles a Transition's expression into a ready-to-evaluate AST node.
	 * An empty expression is compiled to `FALSE` (transition never triggered).
	 *
	 * @throws ProjectPreCompilerError if the expression is lexically, syntactically, or semantically invalid.
	 */
	static preCompile(step: Step, grafcet: Grafcet): PreCompiledStep {
		const node = IdentifiersBuilder.buildIdentifierNode(
			StepVariableGenerator.stepVariableMnemonic(step.data.number as number),
			0,
		);
		const transitionId = grafcet
			.getConnectionsByElementIdAndHandleId(step.id, GRAFCET_STEP_HANDLES.fromTransition)
			.map((c) => c.source.id)[0];
		const stepsIdsBeforeTransition: string[] = [];
		grafcet
			.getConnectionsByElementIdAndHandleId(transitionId, GRAFCET_TRANSITION_HANDLES.fromStep)
			.forEach((c) => {
				const source = c.source;
				if (source.type === GRAFCET_STEP_TYPE) {
					stepsIdsBeforeTransition.push(source.id);
				} else if ((source.type = GRAFCET_JUNCTION_AND_END_TYPE)) {
					//Get the steps before the junction
					grafcet
						.getConnectionsByElementId(source.id)
						.filter((c) => c.source.type === GRAFCET_STEP_TYPE)
						.forEach((c) => stepsIdsBeforeTransition.push(c.source.id));
				}
			});
		return {
			node,
			transitionId, //A step can only have one upstream transition, so we take the first (and only) id
			stepsIdsBeforeTransition,
		};
	}
}
