import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import {
	PreCompiledCoilAssignment,
	PreCompiledLadder,
	PreCompiledLadderAssignment,
} from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import { PLCRoutineCall } from "@/simulator/core/plc/plc-routine";

export type CompiledLadder = {
	nodes: ASTNode[];
	timers: TimerNode[];
	counters: CounterNode[];
	calls: PLCRoutineCall[];
};

export default class LadderCompiler {
	/**
	 * Une instruction par bobine/port de bloc (dans l'ordre déjà garanti par `LadderPreCompiler`,
	 * impératif pour les ports de bloc — voir `PreCompiledBlockPortAssignment`), puis une par mise
	 * à jour de variable mémoire de contact P/N. Les appels de bloc (`calls`) ne sont pas des
	 * `ASTNode` : ce sont des instructions au niveau `PLCRoutine`, exécutées après les `nodes`,
	 * chacune invoquant la routine d'un autre programme si la variable mémoire de son port `EN`
	 * (déjà affectée parmi les `nodes`) est vraie — voir `PLCRoutine.execute`.
	 */
	static compile(preCompiledLadder: PreCompiledLadder): CompiledLadder {
		const nodes: ASTNode[] = [
			...preCompiledLadder.assignments.map((assignment) =>
				this.compileAssignment(assignment),
			),
			...preCompiledLadder.edgeMemoUpdates.map((update) =>
				StatementsBuilder.buildAssignStatementNode(
					update.memoIdentifier,
					update.sourceIdentifier,
				),
			),
		];
		const calls: PLCRoutineCall[] = preCompiledLadder.blockCalls.map(
			(call) => ({
				programId: call.programId,
				condition: IdentifiersBuilder.buildIdentifierNode(call.enMnemonic),
			}),
		);

		return {
			nodes,
			timers: preCompiledLadder.timers,
			counters: preCompiledLadder.counters,
			calls,
		};
	}

	/** Un nœud matérialisé par un bloc (`TimerNode`/`CounterNode` d'un timer/compteur, `IfControlNode`
	 * d'un assign/arithmetic) est embarqué tel quel parmi les instructions : il n'a pas besoin d'être
	 * enveloppé dans une affectation, `PLCRoutine.execute` l'évalue directement pour ses effets de
	 * bord (voir `PreCompiledEmbeddedNodeAssignment`). */
	private static compileAssignment(
		assignment: PreCompiledLadderAssignment,
	): ASTNode {
		if (assignment.kind === "embeddedNode") {
			return assignment.node;
		}
		if (assignment.kind === "blockPort") {
			return StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode(assignment.mnemonic),
				assignment.value,
			);
		}
		return this.compileCoilAssignment(assignment);
	}

	private static compileCoilAssignment(
		assignment: PreCompiledCoilAssignment,
	): ASTNode {
		const coilIdentifier = IdentifiersBuilder.buildIdentifierNode(
			assignment.variable,
		);

		if (assignment.mode === "normal") {
			return StatementsBuilder.buildAssignStatementNode(
				coilIdentifier,
				assignment.condition,
			);
		}

		// set/reset : latch — n'assigne que quand la condition est vraie, ne force jamais l'inverse
		return ControlsBuilder.buildIfControlNode(
			assignment.condition,
			[
				StatementsBuilder.buildAssignStatementNode(
					coilIdentifier,
					LiteralsBuilder.buildBooleanNode(assignment.mode === "set"),
				),
			],
			null,
		);
	}
}
