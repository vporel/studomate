import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { PreCompiledGrafcet } from "../project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledProject } from "../project-pre-compiler/project.pre-compiler";
import PLCRoutine from "../simulator/core/plc/plc-routine";
import { ProgramType } from "../schemas/program/program.schema";
import { PreCompiledProgram } from "../project-pre-compiler/pre-compiled-program";
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

/**
 * Une entrée par notation. Chacune rétrécit le pré-compilé opaque sur son propre type :
 * c'est le seul endroit qui sait à quoi ressemble le pré-compilé d'une notation donnée.
 */
const PROGRAM_COMPILERS: Record<
	ProgramType,
	(preCompiled: PreCompiledProgram) => { nodes: ASTNode[]; timers: TimerNode[] }
> = {
	grafcet: (preCompiled) => GrafcetCompiler.compile(preCompiled as PreCompiledGrafcet),
};

export default class ProjectCompiler {
	/**
	 * Converts a PreCompiledProject into a CompiledProject, ready to be executed by the simulator.
	 */
	static compile(preCompiledProject: PreCompiledProject): ProjectCompilationResult {
		try {
			const timers: TimerNode[] = [];
			// Build routine nodes for all grafcets
			const programsNodes = Object.values(preCompiledProject.programs)
				.map((preCompiledProgram) => {
					if (!preCompiledProgram) return [];
					const compiler = PROGRAM_COMPILERS[preCompiledProgram.type];
					if (!compiler) {
						console.error(`Aucun compilateur pour la notation "${preCompiledProgram.type}"`);
						return [];
					}
					const compiled = compiler(preCompiledProgram);
					timers.push(...compiled.timers);
					return compiled.nodes;
				})
				.filter((r) => r.length > 0);
			const routines: PLCRoutine[] = [...programsNodes.map((nodes) => new PLCRoutine(nodes))];

			//Perform a semantic check on all the routines
			//No error is caught here, as we assume the pre-compilation step should have caught all possible errors and produced a clean AST.
			//If an error is thrown here, it means there's a bug in the pre-compiler/compiler.
			const semanticAnalyser = new SemanticAnalyserVisitor(
				new Environment(preCompiledProject.variables.map(PlcVariablesMapper.plcToEnv)),
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
