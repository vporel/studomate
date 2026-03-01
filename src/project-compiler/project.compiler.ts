import VariablesMapper from "@/simulator/bridge/variables.mapper";
import { TimerNode } from "@/simulator/compiler/ast/nodes/blocks";
import { Environment } from "@/simulator/compiler/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/compiler/semantic-analyser/semantic-analyser.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { PreCompiledProject } from "../project-pre-compiler/project.pre-compiler";
import PLCRoutine from "../simulator/core/plc/plc-routine";
import GrafcetCompiler from "./compilers/grafcet/grafcet.compiler";

/**
 * - variables : all PLCVariables needed at runtime (user + steps Xi + generated memos)
 * - routine   : a single flat PLCRoutine that drives one full scan cycle across all grafcets
 */
export type CompiledProject = {
	variables: PLCVariable[];
	routines: PLCRoutine[];
	timers: TimerNode[];
};

export type ProjectCompilationResult = {
	errors: string[];
	result?: CompiledProject;
};

export default class ProjectCompiler {
	/**
	 * Converts a PreCompiledProject into a CompiledProject, ready to be executed by the simulator.
	 */
	static compile(preCompiledProject: PreCompiledProject): ProjectCompilationResult {
		try {
			const timers: TimerNode[] = [];
			// Build routine nodes for all grafcets
			const grafcetsNodes = Object.values(preCompiledProject.grafcets)
				.map((preCompiledGrafcet) => {
					if (!preCompiledGrafcet) return [];
					const compiledGrafcet = GrafcetCompiler.compile(preCompiledGrafcet);
					timers.push(...compiledGrafcet.timers);
					return compiledGrafcet.nodes;
				})
				.filter((r) => r.length > 0);
			const routines: PLCRoutine[] = [...grafcetsNodes.map((nodes) => new PLCRoutine(nodes))];

			//Perform a semantic check on all the routines
			//No error is caught here, as we assume the pre-compilation step should have caught all possible errors and produced a clean AST.
			//If an error is thrown here, it means there's a bug in the pre-compiler/compiler.
			const semanticAnalyser = new SemanticAnalyserVisitor(
				new Environment(preCompiledProject.variables.map(VariablesMapper.plcToEnv)),
			);
			routines.forEach((routine) => {
				routine.getNodes().forEach((node) => semanticAnalyser.visit(node));
			});

			return {
				errors: [],
				result: {
					variables: preCompiledProject.variables,
					routines,
					timers,
				},
			};
		} catch (e) {
			return { errors: [e instanceof Error ? e.message : String(e)] };
		}
	}
}
