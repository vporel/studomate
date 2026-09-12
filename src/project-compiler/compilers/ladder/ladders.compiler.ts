import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import NotationCompiler, {
	NotationCompilationOutput,
} from "@/project-compiler/notation-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import { isPreCompiledLadder } from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import LadderCompiler from "./ladder.compiler";

/**
 * Compile tous les ladders d'un projet. Chaque ladder devient une routine indexée par id, mais
 * seul le Main (`role === "main"`, le seul point d'entrée — voir `Ladder.role`) est scanné
 * directement : un ladder standard ne s'exécute que si un bloc `"user-program"` l'appelle, via
 * son entrée dans `routinesById`.
 */
export default class LaddersCompiler implements NotationCompiler {
	compile(preCompiledProject: PreCompiledProject): NotationCompilationOutput {
		const routinesById: Record<string, PLCRoutine> = {};
		const timers: TimerNode[] = [];
		const counters: CounterNode[] = [];
		let mainRoutine: PLCRoutine | null = null;

		for (const [programId, program] of Object.entries(
			preCompiledProject.programs,
		)) {
			if (!program || !isPreCompiledLadder(program)) continue;
			const compiled = LadderCompiler.compile(program);
			timers.push(...compiled.timers);
			counters.push(...compiled.counters);
			const routine = new PLCRoutine(compiled.nodes, compiled.calls);
			routinesById[programId] = routine;
			if (program.role === "main") mainRoutine = routine;
		}

		return {
			routinesById,
			scanRoutines: mainRoutine ? [mainRoutine] : [],
			trailingRoutines: [],
			timers,
			counters,
			observableExpressionVariableIds: {},
		};
	}
}
