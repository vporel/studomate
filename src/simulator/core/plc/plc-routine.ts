import PlcVariablesMapper from "@/simulator/environment-plc.mapper";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { Environment } from "@/simulator/interpreter/environment/environment";
import EvaluatorVisitor from "@/simulator/interpreter/evaluator/evaluator.visitor";
import PLC from "./plc";

/**
 * A ready-to-execute PLC routine.
 *
 * We assume that the routine has already been lexed, parsed semantically analysed, and simplified,
 * so it only contains nodes that are valid and can be directly evaluated.
 *
 * At runtime, execute() evaluates the stored nodes against the current
 * state of a PLC instance and writes the results back to it.
 */
export default class PLCRoutine {
	private readonly nodes: ASTNode[];

	constructor(nodes: ASTNode[]) {
		this.nodes = nodes;
	}

	getNodes(): readonly ASTNode[] {
		return this.nodes;
	}

	execute(plc: PLC): void {
		const plcVariablesSnapshot = plc.getVariablesSnapshot();
		const env = new Environment(plcVariablesSnapshot.map(PlcVariablesMapper.plcToEnv));

		const evaluator = new EvaluatorVisitor(env, {
			timers: {
				deltaTimeMs: plc.getClockIntervalMs(),
			},
		});
		for (const node of this.nodes) {
			evaluator.visit(node);
		}

		for (const variable of plcVariablesSnapshot) {
			const id = variable.getId();
			const value = env.getVariableValueById(id);
			if (variable.getScope() === "output") {
				plc.setOutputImageValueById(id, value);
			} else if (variable.getScope() === "memory") {
				plc.setMemoryValueById(id, value);
			}
		}
	}
}
