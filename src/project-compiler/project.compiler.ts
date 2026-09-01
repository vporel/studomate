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
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
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
 * Une entrée par notation. Chacune rétrécit le pré-compilé opaque sur son propre type :
 * c'est le seul endroit qui sait à quoi ressemble le pré-compilé d'une notation donnée.
 */
const PROGRAM_COMPILERS: Record<
	ProgramType,
	(preCompiled: PreCompiledProgram) => {
		nodes: ASTNode[];
		/** Nœuds d'initialisation à exécuter après la routine des mémos d'étape (grafcets). */
		initNodes: ASTNode[];
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
	ladder: (preCompiled) => ({
		...LadderCompiler.compile(preCompiled as PreCompiledLadder),
		initNodes: [],
	}),
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
	static compile(
		preCompiledProject: PreCompiledProject,
	): ProjectCompilationResult {
		try {
			const timers: TimerNode[] = [];
			const counters: CounterNode[] = [];
			const routinesById: Record<string, PLCRoutine> = {};
			const initNodes: ASTNode[] = [];
			let mainProgramId: string | null = null;

			for (const [programId, preCompiledProgram] of Object.entries(
				preCompiledProject.programs,
			)) {
				if (!preCompiledProgram) continue;
				const compiler = PROGRAM_COMPILERS[preCompiledProgram.type];
				if (!compiler) {
					console.error(
						`Aucun compilateur pour la notation "${preCompiledProgram.type}"`,
					);
					continue;
				}
				const compiled = compiler(preCompiledProgram);
				timers.push(...compiled.timers);
				counters.push(...compiled.counters);
				initNodes.push(...compiled.initNodes);
				routinesById[programId] = new PLCRoutine(
					compiled.nodes,
					compiled.calls,
				);
				if (
					preCompiledProgram.type === "ladder" &&
					(preCompiledProgram as PreCompiledLadder).role === "main"
				) {
					mainProgramId = programId;
				}
			}

			//Routine d'assignation des mémos d'étape : `Xi_memo := Xi` pour toutes les étapes de
			//tous les grafcets. Exécutée après toutes les routines de grafcet (mais avant la routine
			//d'initialisation) pour que chacune ait lu la même situation (mémos figés en début de
			//cycle) — franchissements simultanés entre grafcets (règle 3). Voir
			//`ProjectPreCompiler.rebindStepReferencesToMemos`.
			const stepMemoNodes: ASTNode[] = [];
			for (const preCompiledProgram of Object.values(
				preCompiledProject.programs,
			)) {
				if (preCompiledProgram?.type !== "grafcet") continue;
				const grafcet = preCompiledProgram as PreCompiledGrafcet;
				for (const [stepId, memo] of grafcet.stepsMemos) {
					const step = grafcet.steps.get(stepId);
					if (!step) continue;
					stepMemoNodes.push(
						StatementsBuilder.buildAssignStatementNode(memo.node, step.node),
					);
				}
			}
			const stepMemosRoutine = new PLCRoutine(stepMemoNodes);
			const initRoutine = new PLCRoutine(initNodes);

			const routines: PLCRoutine[] = [
				...Object.entries(preCompiledProject.programs)
					.filter(([, program]) => program?.type === "grafcet")
					.map(([programId]) => routinesById[programId]),
				...(stepMemoNodes.length > 0 ? [stepMemosRoutine] : []),
				...(initNodes.length > 0 ? [initRoutine] : []),
				...(mainProgramId ? [routinesById[mainProgramId]] : []),
			];

			//Routine d'observation : une affectation par transition GRAFCET, `varRéceptivité := <réceptivité>`.
			//Ajoutée en dernier pour que toutes les routines réelles aient tourné avant (état des
			//étapes final, sorties de tempo à jour — voir `transitionObservations`).
			const evaluableExpressionVariableIds: Record<string, string> = {};
			const observationNodes: ASTNode[] = [];
			for (const preCompiledProgram of Object.values(
				preCompiledProject.programs,
			)) {
				if (preCompiledProgram?.type !== "grafcet") continue;
				for (const [sourceId, observation] of (
					preCompiledProgram as PreCompiledGrafcet
				).transitionObservations) {
					evaluableExpressionVariableIds[sourceId] =
						observation.variable.getId();
					observationNodes.push(
						StatementsBuilder.buildAssignStatementNode(
							IdentifiersBuilder.buildIdentifierNode(
								observation.variable.getName(),
							),
							observation.node,
						),
					);
				}
			}
			const observationRoutine = new PLCRoutine(observationNodes);
			if (observationNodes.length > 0) routines.push(observationRoutine);

			//Perform a semantic check on all the routines (y compris celles appelées, pas seulement
			//les scannées directement) et leurs conditions d'appel.
			//No error is caught here, as we assume the pre-compilation step should have caught all possible errors and produced a clean AST.
			//If an error is thrown here, it means there's a bug in the pre-compiler/compiler.
			const semanticAnalyser = new SemanticAnalyserVisitor(
				new Environment(
					preCompiledProject.variables.map(PlcVariablesMapper.plcToEnv),
				),
			);
			Object.values(routinesById).forEach((routine) => {
				routine.getNodes().forEach((node) => semanticAnalyser.visit(node));
				routine
					.getCalls()
					.forEach((call) => semanticAnalyser.visit(call.condition));
			});
			stepMemosRoutine
				.getNodes()
				.forEach((node) => semanticAnalyser.visit(node));
			initRoutine.getNodes().forEach((node) => semanticAnalyser.visit(node));
			observationRoutine
				.getNodes()
				.forEach((node) => semanticAnalyser.visit(node));

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
