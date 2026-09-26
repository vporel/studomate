import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import {
	PreCompiledCallAssignment,
	PreCompiledCoilAssignment,
	PreCompiledLadder,
	PreCompiledLadderAssignment,
} from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";
import { PLCRoutineInstruction } from "@/simulator/core/plc/plc-routine";

export type CompiledLadder = {
	instructions: PLCRoutineInstruction[];
	timers: TimerNode[];
	counters: CounterNode[];
};

export default class LadderCompiler {
	/**
	 * Une instruction par affectation pré-compilée (bobine, front de contact, port de bloc, appel
	 * de programme), dans l'ordre déjà garanti par `LadderPreCompiler`. Un appel n'est pas un
	 * `ASTNode` : c'est une instruction au niveau `PLCRoutine`, qui invoque la routine d'un autre
	 * programme si la variable mémoire de son port `EN` (affectée juste avant) est vraie — voir
	 * `PLCRoutine.execute`.
	 */
	static compile(preCompiledLadder: PreCompiledLadder): CompiledLadder {
		return {
			instructions: preCompiledLadder.assignments.map((assignment) =>
				assignment.kind === "call"
					? {
							kind: "call",
							programId: assignment.programId,
							condition: IdentifiersBuilder.buildIdentifierNode(
								assignment.enMnemonic,
							),
						}
					: { kind: "node", node: this.compileAssignment(assignment) },
			),
			timers: preCompiledLadder.timers,
			counters: preCompiledLadder.counters,
		};
	}

	/** Un nœud matérialisé par un bloc (`TimerNode`/`CounterNode` d'un timer/compteur, `IfControlNode`
	 * d'un assign/arithmetic) est embarqué tel quel parmi les instructions : il n'a pas besoin d'être
	 * enveloppé dans une affectation, `PLCRoutine.execute` l'évalue directement pour ses effets de
	 * bord (voir `PreCompiledEmbeddedNodeAssignment`). */
	private static compileAssignment(
		assignment: Exclude<PreCompiledLadderAssignment, PreCompiledCallAssignment>,
	): ASTNode {
		if (assignment.kind === "embeddedNode") {
			return assignment.node;
		}
		if (assignment.kind === "blockPort" || assignment.kind === "contactEdge") {
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
