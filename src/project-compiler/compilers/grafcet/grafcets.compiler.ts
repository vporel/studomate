import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import NotationCompiler, {
	NotationCompilationOutput,
} from "@/project-compiler/notation-compiler";
import { PreCompiledProject } from "@/project-pre-compiler/project.pre-compiler";
import { isPreCompiledGrafcet } from "@/project-pre-compiler/pre-compilers/grafcet/grafcet.pre-compiler";
import PLCRoutine from "@/simulator/core/plc/plc-routine";
import GrafcetCompiler from "./grafcet.compiler";

/**
 * Compile tous les grafcets d'un projet et leurs artefacts de niveau projet :
 *
 * - une routine par grafcet (transitions + actions), scannée directement chaque cycle ;
 * - la routine d'assignation des mémos d'étape (`Xi_memo := Xi` pour toutes les étapes de tous
 *   les grafcets), scannée après toutes les routines de grafcet pour que chacune ait lu la même
 *   situation — franchissements simultanés entre grafcets (règle 3, voir
 *   `ProjectPreCompiler.rebindStepReferencesToMemos`) ;
 * - la routine d'amorçage (active l'étape initiale de chaque grafcet si aucune n'est active),
 *   scannée après celle des mémos (voir `GrafcetCompiler.buildInitializationNodes`) ;
 * - la routine d'observation (`varRéceptivité := <réceptivité>` par transition), scannée en
 *   dernier une fois toutes les routines réelles passées (état des étapes final, sorties de
 *   tempo à jour).
 */
export default class GrafcetsCompiler implements NotationCompiler {
	compile(preCompiledProject: PreCompiledProject): NotationCompilationOutput {
		const grafcets = Object.entries(preCompiledProject.programs).flatMap(
			([programId, program]) =>
				program && isPreCompiledGrafcet(program)
					? [[programId, program] as const]
					: [],
		);

		const routinesById: Record<string, PLCRoutine> = {};
		const scanRoutines: PLCRoutine[] = [];
		const timers: TimerNode[] = [];

		for (const [programId, grafcet] of grafcets) {
			const compiled = GrafcetCompiler.compile(grafcet);
			timers.push(...compiled.timers);
			const routine = new PLCRoutine(compiled.nodes);
			routinesById[programId] = routine;
			scanRoutines.push(routine);
		}

		const stepMemoNodes: ASTNode[] = [];
		for (const [, grafcet] of grafcets) {
			for (const [stepId, memo] of grafcet.stepsMemos) {
				const step = grafcet.steps.get(stepId);
				if (!step) continue;
				stepMemoNodes.push(
					StatementsBuilder.buildAssignStatementNode(memo.node, step.node),
				);
			}
		}
		if (stepMemoNodes.length > 0) {
			scanRoutines.push(new PLCRoutine(stepMemoNodes));
		}

		const initNodes: ASTNode[] = [];
		for (const [, grafcet] of grafcets) {
			initNodes.push(...GrafcetCompiler.buildInitializationNodes(grafcet));
		}
		if (initNodes.length > 0) {
			scanRoutines.push(new PLCRoutine(initNodes));
		}

		const observableExpressionVariableIds: Record<string, string> = {};
		const observationNodes: ASTNode[] = [];
		for (const [, grafcet] of grafcets) {
			for (const [sourceId, observation] of grafcet.transitionObservations) {
				observableExpressionVariableIds[sourceId] =
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
		const trailingRoutines =
			observationNodes.length > 0 ? [new PLCRoutine(observationNodes)] : [];

		return {
			routinesById,
			scanRoutines,
			trailingRoutines,
			timers,
			counters: [],
			observableExpressionVariableIds,
		};
	}
}
