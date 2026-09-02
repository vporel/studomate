import PLCVariable from "@/simulator/core/plc/plc-variable";
import Project from "@/schemas/project/project.schema";
import Variable from "@/schemas/variable/variable.schema";
import { Dialect } from "@/expression-language/dialect.enum";
import Program, { ProgramType } from "@/schemas/program/program.schema";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import ReplacerVisitor, {
	ReplacerVisitorReplacement,
} from "@/expression-language/ast/visitors/replacer.visitor";
import { PreCompiledProgram } from "./pre-compiled-program";
import GrafcetPreCompiler, {
	isPreCompiledGrafcet,
} from "./pre-compilers/grafcet/grafcet.pre-compiler";
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
	(
		program: any,
		variables: PLCVariable[],
		dialect: Dialect,
		errors: ProjectPreCompilerError[],
	) => PreCompiledProgram
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
		const variables = VariableCompiler.compile([
			...project.variables,
			...stepsVariables,
		]);
		const errors: ProjectPreCompilerError[] = [];
		const programs: Record<string, PreCompiledProgram> = {};

		for (const [programId, program] of Object.entries(project.programs)) {
			const preCompiler = PROGRAM_PRE_COMPILERS[(program as Program).type];
			if (!preCompiler) {
				console.error(
					`Aucun pré-compilateur pour la notation "${(program as Program).type}"`,
				);
				continue;
			}
			programs[programId] = preCompiler(program, variables, dialect, errors);
		}

		this.rebindStepReferencesToMemos(programs);

		return { errors, result: { variables, programs } };
	}

	/**
	 * Réécrit toute référence à une étape `X{n}` figurant dans une réceptivité vers la variable
	 * de mémoire qui porte la valeur de l'étape **figée en début de cycle** (`stepsMemos`).
	 *
	 * Sans ça, une réceptivité d'un grafcet qui lit l'étape d'un autre grafcet voit la valeur
	 * vive : selon l'ordre d'exécution des routines, elle observe l'état de l'autre grafcet
	 * avant ou après ses franchissements du cycle courant. La routine d'assignation des mémos
	 * (`ProjectCompiler`) ne tourne qu'après tous les grafcets, donc tous lisent la même
	 * situation — franchissements simultanés (règle 3).
	 *
	 * Les conditions d'action ne sont pas touchées : elles lisent volontairement l'étape vive
	 * de leur propre grafcet (`stepNode`) pour détecter les fronts sur le cycle courant.
	 */
	private static rebindStepReferencesToMemos(
		programs: Record<string, PreCompiledProgram>,
	): void {
		const memoNameByStepMnemonic = new Map<string, string>();
		for (const program of Object.values(programs)) {
			if (!isPreCompiledGrafcet(program)) continue;
			for (const [stepId, step] of program.steps) {
				const memo = program.stepsMemos.get(stepId);
				if (memo)
					memoNameByStepMnemonic.set(step.node.value, memo.variable.getName());
			}
		}
		if (memoNameByStepMnemonic.size === 0) return;

		const replacements: ReplacerVisitorReplacement[] = Array.from(
			memoNameByStepMnemonic,
		).map(([stepMnemonic, memoName]) => ({
			predicate: (node) =>
				node.type === "IDENTIFIER" && node.value === stepMnemonic,
			replacement: IdentifiersBuilder.buildIdentifierNode(memoName),
		}));
		const replacer = new ReplacerVisitor(replacements);

		for (const program of Object.values(programs)) {
			if (!isPreCompiledGrafcet(program)) continue;
			for (const transition of program.transitions.values()) {
				transition.node = replacer.visit(transition.node);
				transition.pureNode = replacer.visit(transition.pureNode);
			}
		}
	}
}
