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
export type PLCRoutineCall = {
	kind: "call";
	programId: string;
	condition: ASTNode;
};

export type PLCRoutineInstruction =
	{ kind: "node"; node: ASTNode } | PLCRoutineCall;

/**
 * A ready-to-execute PLC routine.
 *
 * We assume that the routine has already been lexed, parsed semantically analysed, and simplified,
 * so it only contains nodes that are valid and can be directly evaluated.
 *
 * At runtime, execute() evaluates the stored instructions against the environment shared by every
 * routine of the same PLC cycle, mutating it directly — so a later routine sees the writes of
 * an earlier one without going through the PLC. Instructions run in order: a call runs at its
 * position, invoking another routine (recursively, so a called routine's own calls run in turn)
 * found in `routinesById` by `programId`, and is silently skipped if absent (project
 * malformed/mid-edit, never a reason to crash a running simulation).
 */
export default class PLCRoutine {
	private readonly instructions: PLCRoutineInstruction[];
	/** Réutilisé de cycle en cycle : seuls `env` et `deltaTimeMs` changent (voir `execute`). */
	private evaluator: EvaluatorVisitor | null = null;

	constructor(instructions: PLCRoutineInstruction[]) {
		this.instructions = instructions;
	}

	static fromNodes(nodes: ASTNode[]): PLCRoutine {
		return new PLCRoutine(nodes.map((node) => ({ kind: "node", node })));
	}

	getInstructions(): readonly PLCRoutineInstruction[] {
		return this.instructions;
	}

	execute(
		env: Environment,
		deltaTimeMs: number,
		routinesById: Record<string, PLCRoutine> = {},
	): void {
		if (!this.evaluator) {
			this.evaluator = new EvaluatorVisitor(env, { timers: { deltaTimeMs } });
		} else {
			this.evaluator.setEnvironment(env);
			this.evaluator.setDeltaTimeMs(deltaTimeMs);
		}
		const evaluator = this.evaluator;
		for (const instruction of this.instructions) {
			if (instruction.kind === "node") {
				evaluator.visit(instruction.node);
				continue;
			}
			if (!evaluator.visit(instruction.condition)) continue;
			routinesById[instruction.programId]?.execute(
				env,
				deltaTimeMs,
				routinesById,
			);
		}
	}
}
