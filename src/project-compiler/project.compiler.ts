import Project from "../schemas/project/project.schema";
import PLCRoutine from "../simulator/core/plc/plc-routine";
import { PreCompiledProject } from "../project-pre-compiler/project.pre-compiler";
import MemoVariableGenerator from "./memo-variable.generator";
import { PLCVariable } from "../simulator/core/plc/plc";
import GrafcetCompiler from "./compilers/grafcet/grafcet.compiler";
import { IdentifierNode } from "../simulator/compiler/ast/nodes/identifiers";
import IdentifiersBuilder from "../simulator/compiler/ast/builders/identifiers.builder";

/**
 * - variables : all PLCVariables needed at runtime (user + steps Xi + generated memos)
 * - routine   : a single flat PLCRoutine that drives one full scan cycle across all grafcets
 */
export type CompiledProject = {
	variables: PLCVariable[];
	routines: PLCRoutine[];
};

export type ProjectCompilationResult = {
	errors: string[];
	result?: CompiledProject;
};

export default class ProjectCompiler {
	/**
	 * Converts a PreCompiledProject (AST nodes + topology) into a single executable PLCRoutine.
	 *
	 * Steps:
	 *  1. Identify steps that need edge-detection (have onActivation / onDeactivation action phases)
	 *  2. Generate memo variables when needed (for example : to remember the previous state of a step for edge detection) and add them to the variables list
	 *  3. For each grafcet, produce ASTNodes covering transitions and actions for one scan cycle
	 *  4. Wrap all nodes in a single PLCRoutine
	 *
	 * @param preCompiledProject  Result of ProjectPreCompiler.compile()
	 */
	static compile(preCompiledProject: PreCompiledProject): ProjectCompilationResult {
		try {
			// All mnemonics already used (user vars + synthetic Xi)
			const takenNames = new Set(preCompiledProject.variables.map((v) => v.getName()));

			// Steps that need rising/falling edge-detection memo variables
			const stepsMemosVars: Map<string, PLCVariable> = new Map();
			const stepsMemosNodes: Map<string, IdentifierNode> = new Map();

			Object.values(preCompiledProject.grafcets).forEach((preCompiledGrafcet) => {
				if (!preCompiledGrafcet) return;
				//We create a memo variable for each step
				for (const stepId of Object.keys(preCompiledGrafcet.steps)) {
					const generatedMemoVar = MemoVariableGenerator.generate("boolean", takenNames)
					stepsMemosVars.set(stepId, generatedMemoVar);
					stepsMemosNodes.set(stepId, IdentifiersBuilder.buildIdentifierNode(generatedMemoVar.getName()));
					takenNames.add(generatedMemoVar.getName());
				}
			})

			const allVariables = [...preCompiledProject.variables, ...stepsMemosVars.values()];

			// Build routine nodes for all grafcets
			const grafcetsNodes = Object.values(preCompiledProject.grafcets).map((preCompiledGrafcet) => {
				if (!preCompiledGrafcet) return [];
				return GrafcetCompiler.compile(preCompiledGrafcet, stepsMemosNodes);
			}).filter(r => r.length > 0);

			return { errors: [], result: {
				variables: allVariables,
				routines: grafcetsNodes.map(nodes => new PLCRoutine(nodes))
			} };
		} catch (e) {
			return { errors: [e instanceof Error ? e.message : String(e)] };
		}
	}
}
