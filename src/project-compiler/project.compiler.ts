import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import { Environment } from "@/simulator/interpreter/environment/environment";
import SemanticAnalyserVisitor from "@/simulator/interpreter/semantic-analyser/semantic-analyser.visitor";
import PLCVariable from "@/simulator/core/plc/plc-variable";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import NotationCompiler from "./notation-compiler";
import GrafcetsCompiler from "./compilers/grafcet/grafcets.compiler";
import LaddersCompiler from "./compilers/ladder/ladders.compiler";

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
	/**
	 * Id d'élément observable (transition GRAFCET) → id de la variable de mémoire qui porte
	 * l'état de sa réceptivité. Alimentée par la routine d'observation ajoutée en fin de
	 * `routines`. L'UI lit ces valeurs pour surligner les transitions franchissables.
	 */
	evaluableExpressionVariableIds: Record<string, string>;
};

export type ProjectCompilationResult = {
	errors: string[];
	result?: CompiledProject;
};

/**
 * Une entrée par notation. **L'ordre est l'ordre de scan** : les `scanRoutines` de chaque
 * notation s'enchaînent dans cet ordre (grafcets — routines, mémos, amorçage — puis Main),
 * les `trailingRoutines` (observation GRAFCET) fermant la marche.
 */
const NOTATION_COMPILERS: NotationCompiler[] = [
	new GrafcetsCompiler(),
	new LaddersCompiler(),
];

export default class ProjectCompiler {
	/**
	 * Converts a PreCompiledProject into a CompiledProject, ready to be executed by the simulator.
	 *
	 * Chaque programme (grafcet ou ladder) devient une `PLCRoutine`, indexée dans `routinesById`.
	 * Seuls les grafcets et le Main du projet (le seul ladder qui soit un point d'entrée — voir
	 * `Ladder.role`) sont scannés directement (`routines`) ; un ladder standard ne s'exécute que
	 * si un bloc `"user-program"`, quelque part, l'appelle avec son `EN` vrai à ce balayage.
	 *
	 * Toute la logique propre à une notation vit dans son `NotationCompiler` ; ici on n'assemble
	 * que des primitives moteur.
	 */
	static compile(
		preCompiledProject: PreCompiledProject,
	): ProjectCompilationResult {
		try {
			const outputs = NOTATION_COMPILERS.map((compiler) =>
				compiler.compile(preCompiledProject),
			);

			const routinesById: Record<string, PLCRoutine> = {};
			const timers: TimerNode[] = [];
			const counters: CounterNode[] = [];
			const evaluableExpressionVariableIds: Record<string, string> = {};
			for (const output of outputs) {
				Object.assign(routinesById, output.routinesById);
				timers.push(...output.timers);
				counters.push(...output.counters);
				Object.assign(
					evaluableExpressionVariableIds,
					output.observableExpressionVariableIds,
				);
			}

			const routines: PLCRoutine[] = [
				...outputs.flatMap((output) => output.scanRoutines),
				...outputs.flatMap((output) => output.trailingRoutines),
			];

			//Perform a semantic check on all the routines (y compris celles appelées, pas seulement
			//les scannées directement) et leurs conditions d'appel.
			//No error is caught here, as we assume the pre-compilation step should have caught all possible errors and produced a clean AST.
			//If an error is thrown here, it means there's a bug in the pre-compiler/compiler.
			const semanticAnalyser = new SemanticAnalyserVisitor(
				new Environment(
					preCompiledProject.variables.map(PlcVariablesMapper.plcToEnv),
				),
			);
			const checked = new Set<PLCRoutine>();
			const check = (routine: PLCRoutine) => {
				if (checked.has(routine)) return;
				checked.add(routine);
				routine.getNodes().forEach((node) => semanticAnalyser.visit(node));
				routine
					.getCalls()
					.forEach((call) => semanticAnalyser.visit(call.condition));
			};
			Object.values(routinesById).forEach(check);
			routines.forEach(check);

			return {
				errors: [],
				result: {
					variables: preCompiledProject.variables,
					routines,
					routinesById,
					timers,
					counters,
					evaluableExpressionVariableIds,
				},
			};
		} catch (e) {
			return { errors: [e instanceof Error ? e.message : String(e)] };
		}
	}
}
