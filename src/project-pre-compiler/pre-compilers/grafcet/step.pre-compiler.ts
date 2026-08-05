import StepVariableGenerator from "@/project-analyser/analysers/grafcet/step-variable.generator";
import Step from "@/schemas/grafcet/step.schema";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";

export type PreCompiledStep = {
	node: IdentifierNode;
	initial: boolean;
};

export default class StepPreCompiler {
	static preCompile(step: Step): PreCompiledStep {
		const node = IdentifiersBuilder.buildIdentifierNode(
			StepVariableGenerator.stepVariableMnemonic(step.data.number as number),
			0,
		);

		return {
			node,
			initial: step.data.initial === true,
		};
	}
}
