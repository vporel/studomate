import PLCVariable from "@/simulator/core/plc/plc-variable";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import Program, { ProgramType } from "@/schemas/program/program.schema";
import { PreCompiledProgram } from "./pre-compiled-program";
import GrafcetPreCompiler from "./pre-compilers/grafcet/grafcet.pre-compiler";
import LadderPreCompiler from "./pre-compilers/ladder/ladder.pre-compiler";
import VariableCompiler from "./pre-compilers/variable.pre-compiler";
import ProjectPreCompilerError from "./project.pre-compiler.error";

export type PreCompiledProject = {
	variables: PLCVariable[];
	programs: Record<string, PreCompiledProgram>;
};

/**
 * Une entrée par notation. Chaque pré-compilateur alimente lui-même `variables` avec les
 * variables qu'il génère.
 */
const PROGRAM_PRE_COMPILERS: Record<
	ProgramType,
	(program: any, variables: PLCVariable[], dialect: Dialect, errors: ProjectPreCompilerError[]) => PreCompiledProgram
> = {
	grafcet: (grafcet, variables, dialect, errors) =>
		GrafcetPreCompiler.preCompile(grafcet, variables, dialect, errors),
	ladder: (ladder, variables, dialect, errors) =>
		LadderPreCompiler.preCompile(ladder, variables, dialect, errors),
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
		dialect: Dialect = Dialect.FR,
	): ProjectPreCompilationResult {
		const variables = VariableCompiler.compile([...project.variables, ...stepsVariables]);
		const errors: ProjectPreCompilerError[] = [];
		const programs: Record<string, PreCompiledProgram> = {};

		for (const [programId, program] of Object.entries(project.programs)) {
			const preCompiler = PROGRAM_PRE_COMPILERS[(program as Program).type];
			if (!preCompiler) {
				console.error(`Aucun pré-compilateur pour la notation "${(program as Program).type}"`);
				continue;
			}
			programs[programId] = preCompiler(program, variables, dialect, errors);
		}

		return { errors, result: { variables, programs } };
	}
}
