import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { Environment } from "@/simulator/interpreter/environment/environment";
import EvaluatorVisitor from "@/simulator/interpreter/evaluator/evaluator.visitor";

/**
 * A ready-to-execute PLC routine.
 *
 * We assume that the routine has already been lexed, parsed semantically analysed, and simplified,
 * so it only contains nodes that are valid and can be directly evaluated.
 *
 * At runtime, execute() evaluates the stored nodes against the environment shared by every
 * routine of the same PLC cycle, mutating it directly — so a later routine sees the writes of
 * an earlier one without going through the PLC.
 */
export default class PLCRoutine {
	private readonly nodes: ASTNode[];

	constructor(nodes: ASTNode[]) {
		this.nodes = nodes;
	}

	getNodes(): readonly ASTNode[] {
		return this.nodes;
	}

	execute(env: Environment, deltaTimeMs: number): void {
		const evaluator = new EvaluatorVisitor(env, {
			timers: {
				deltaTimeMs,
			},
		});
		for (const node of this.nodes) {
			evaluator.visit(node);
		}
	}
}
