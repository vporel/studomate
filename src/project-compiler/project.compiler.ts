import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { PreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import { PreCompiledLadder } from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import PLCRoutine, { PLCRoutineCall } from "@/simulator/core/plc/plc-routine";
import { ProgramType } from "@/schemas/program/program.schema";
import { PreCompiledProgram } from "@/project-pre-compiler/pre-compiled-program";
import GrafcetCompiler from "./compilers/grafcet/grafcet.compiler";
import LadderCompiler from "./compilers/ladder/ladder.compiler";

/**
 * - variables    : all PLCVariables needed at runtime (user + steps Xi + generated memos)
 * - routines     : les routines scannées directement à chaque cycle — tous les grafcets, et
 *                  seulement le Main parmi les ladders (voir `routinesById` pour les autres)
 * - routinesById : toutes les routines compilées, y compris les ladders appelés par un bloc
 *                  `"user-program"` mais jamais scannés directement — registre consommé par
 *                  `PLCRoutine.execute` pour résoudre un appel par `programId`
 */
export type CompiledProject = {
	variables: PLCVariable[];
	routines: PLCRoutine[];
	routinesById: Record<string, PLCRoutine>;
	timers: TimerNode[];
	counters: CounterNode[];
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
	(preCompiled: PreCompiledProgram) => {
		nodes: ASTNode[];
		timers: TimerNode[];
		counters: CounterNode[];
		calls: PLCRoutineCall[];
	}
> = {
	// GRAFCET ne supporte pas encore de bloc "counter" ni "user-program" : toujours vide,
	// contrairement à Ladder.
	grafcet: (preCompiled) => ({
		...GrafcetCompiler.compile(preCompiled as PreCompiledGrafcet),
		counters: [],
		calls: [],
	}),
	ladder: (preCompiled) => LadderCompiler.compile(preCompiled as PreCompiledLadder),
};

export default class ProjectCompiler {
	/**
	 * Converts a PreCompiledProject into a CompiledProject, ready to be executed by the simulator.
	 *
	 * Chaque programme (grafcet ou ladder) devient une `PLCRoutine`, indexée dans `routinesById`.
	 * Seuls les grafcets et le Main du projet (le seul ladder qui soit un point d'entrée — voir
	 * `Ladder.role`) sont scannés directement (`routines`) ; un ladder standard ne s'exécute que
	 * si un bloc `"user-program"`, quelque part, l'appelle avec son `EN` vrai ce balayage.
	 */
	static compile(preCompiledProject: PreCompiledProject): ProjectCompilationResult {
		try {
			const timers: TimerNode[] = [];
			const counters: CounterNode[] = [];
			const routinesById: Record<string, PLCRoutine> = {};
			let mainProgramId: string | null = null;

			for (const [programId, preCompiledProgram] of Object.entries(preCompiledProject.programs)) {
				if (!preCompiledProgram) continue;
				const compiler = PROGRAM_COMPILERS[preCompiledProgram.type];
				if (!compiler) {
					console.error(`Aucun compilateur pour la notation "${preCompiledProgram.type}"`);
					continue;
				}
				const compiled = compiler(preCompiledProgram);
				timers.push(...compiled.timers);
				counters.push(...compiled.counters);
				routinesById[programId] = new PLCRoutine(compiled.nodes, compiled.calls);
				if (preCompiledProgram.type === "ladder" && (preCompiledProgram as PreCompiledLadder).role === "main") {
					mainProgramId = programId;
				}
			}

			const routines: PLCRoutine[] = [
				...Object.entries(preCompiledProject.programs)
					.filter(([, program]) => program?.type === "grafcet")
					.map(([programId]) => routinesById[programId]),
				...(mainProgramId ? [routinesById[mainProgramId]] : []),
			];

			//Perform a semantic check on all the routines (y compris celles appelées, pas seulement
			//les scannées directement) et leurs conditions d'appel.
			//No error is caught here, as we assume the pre-compilation step should have caught all possible errors and produced a clean AST.
			//If an error is thrown here, it means there's a bug in the pre-compiler/compiler.
			const semanticAnalyser = new SemanticAnalyserVisitor(
				new Environment(preCompiledProject.variables.map(PlcVariablesMapper.plcToEnv)),
			);
			Object.values(routinesById).forEach((routine) => {
				routine.getNodes().forEach((node) => semanticAnalyser.visit(node));
				routine.getCalls().forEach((call) => semanticAnalyser.visit(call.condition));
			});

			return {
				errors: [],
				result: {
					variables: preCompiledProject.variables,
					routines,
					routinesById,
					timers,
					counters,
				},
			};
		} catch (e) {
			return { errors: [e instanceof Error ? e.message : String(e)] };
		}
	}
}
