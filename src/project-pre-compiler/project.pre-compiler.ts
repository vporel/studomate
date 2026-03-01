import PLCVariable from "@/simulator/core/plc/plc-variable";
import Project from "../schemas/project/project.schema";
import Variable from "../schemas/variable/variable.schema";
import { Language } from "../simulator/compiler/lexer/language.enum";
import GrafcetPreCompiler, { PreCompiledGrafcet } from "./pre-compilers/grafcet/grafcet.pre-compiler";
import VariableCompiler from "./pre-compilers/variable.pre-compiler";
import ProjectPreCompilerError from "./project.pre-compiler.error";

export type PreCompiledProject = {
	variables: PLCVariable[];
	grafcets: Record<string, PreCompiledGrafcet>;
};

export type ProjectPreCompilationResult = {
	errors: ProjectPreCompilerError[];
	result?: PreCompiledProject;
};

export default class ProjectPreCompiler {
	/**
	 * Compiles an entire project into a PreparedSimulation.
	 *
	 * All expressions (transitions, actions) are lexed, parsed, semantically
	 * analysed and simplified exactly once. The resulting PreparedSimulation
	 * is ready to be handed to a simulator without any further parsing.
	 *
	 * If any expression fails to compile, the result carries all collected
	 * errors (compilation does not stop on first error).
	 */
	static preCompile(
		project: Project,
		stepsVariables: Variable[],
		language: Language = Language.FR,
	): ProjectPreCompilationResult {
		const variables = VariableCompiler.compile([...project.variables, ...stepsVariables]);
		const errors: ProjectPreCompilerError[] = [];
		const grafcets: Record<string, PreCompiledGrafcet> = {};

		for (const [grafcetId, grafcet] of Object.entries(project.grafcets)) {
			grafcets[grafcetId] = GrafcetPreCompiler.preCompile(grafcet, variables, language, errors);
			variables.push(...Object.values(grafcets[grafcetId].stepsMemos).map(({ variable }) => variable));
		}

		return { errors, result: { variables, grafcets } };
	}
}
