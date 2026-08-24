import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { Environment } from "@/simulator/interpreter/environment/environment";
import EvaluatorVisitor from "@/simulator/interpreter/evaluator/evaluator.visitor";

/**
 * Appel conditionnel vers la routine d'un autre programme — produit par un bloc `"user-program"`
 * (`LadderCompiler`). `programId` est résolu à l'exécution via le registre passé à `execute`,
 * jamais lié statiquement : ça permettrait un projet dont deux ladders s'appellent l'un l'autre
 * de continuer à s'exécuter (chacun trouvant l'autre déjà construit), l'analyseur étant seul
 * responsable d'interdire les cycles avant qu'on en arrive là.
 */
export type PLCRoutineCall = { programId: string; condition: ASTNode };

/**
 * A ready-to-execute PLC routine.
 *
 * We assume that the routine has already been lexed, parsed semantically analysed, and simplified,
 * so it only contains nodes that are valid and can be directly evaluated.
 *
 * At runtime, execute() evaluates the stored nodes against the environment shared by every
 * routine of the same PLC cycle, mutating it directly — so a later routine sees the writes of
 * an earlier one without going through the PLC. `calls` are evaluated after `nodes`, each
 * invoking another routine — recursively, so a called routine's own calls run in turn — found in
 * `routinesById` by `programId`, and silently skipped if absent (project malformed/mid-edit,
 * never a reason to crash a running simulation).
 */
export default class PLCRoutine {
	private readonly nodes: ASTNode[];
	private readonly calls: PLCRoutineCall[];

	constructor(nodes: ASTNode[], calls: PLCRoutineCall[] = []) {
		this.nodes = nodes;
		this.calls = calls;
	}

	getNodes(): readonly ASTNode[] {
		return this.nodes;
	}

	getCalls(): readonly PLCRoutineCall[] {
		return this.calls;
	}

	execute(env: Environment, deltaTimeMs: number, routinesById: Record<string, PLCRoutine> = {}): void {
		const evaluator = new EvaluatorVisitor(env, {
			timers: {
				deltaTimeMs,
			},
		});
		for (const node of this.nodes) {
			evaluator.visit(node);
		}
		for (const call of this.calls) {
			if (!evaluator.visit(call.condition)) continue;
			routinesById[call.programId]?.execute(env, deltaTimeMs, routinesById);
		}
	}
}
