import { ASTNode } from "../../../simulator/compiler/ast/nodes/ast-node";
import { PreCompiledGrafcet } from "../../../project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { IdentifierNode } from "../../../simulator/compiler/ast/nodes/identifiers";
import StepCompiler from "./step.compiler";
import ActionCompiler from "./action.compiler";


export default class GrafcetCompiler {

	static compile(
		preCompiledGrafcet: PreCompiledGrafcet,
		stepMemosNodes: Map<string, IdentifierNode>,
	): ASTNode[] {
		return [
			...Object.entries(preCompiledGrafcet.steps)
				.flatMap(([stepId, preCompiledStep]) => StepCompiler.compile(stepId, preCompiledStep, preCompiledGrafcet, stepMemosNodes)),
			...Object.entries(preCompiledGrafcet.actions)
				.filter(([_, preCompiledAction]) => !!preCompiledAction) //Filter out TEXT actions, which are purely descriptive and produce no runtime effect
				.flatMap(([actionId, preCompiledAction]) => ActionCompiler.compile(actionId, preCompiledAction!, preCompiledGrafcet, stepMemosNodes)),
		];
	}

}
