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
		const instructions: PLCRoutineInstruction[] = [];
		const { assignments } = preCompiledLadder;
		for (let index = 0; index < assignments.length; index++) {
			const assignment = assignments[index];
			if (assignment.kind === "call") {
				instructions.push({
					kind: "call",
					programId: assignment.programId,
					condition: IdentifiersBuilder.buildIdentifierNode(
						assignment.enMnemonic,
					),
				});
				continue;
			}
			const group = this.collectCoilGroup(assignments, index);
			if (group.length > 1) {
				instructions.push({
					kind: "node",
					node: this.compileCoilGroup(group),
				});
				index += group.length - 1;
				continue;
			}
			instructions.push({
				kind: "node",
				node: this.compileAssignment(assignment),
			});
		}
		return {
			instructions,
			timers: preCompiledLadder.timers,
			counters: preCompiledLadder.counters,
		};
	}

	/**
	 * Les bobines consécutives qui partagent la même condition d'alimentation (départ de branches
	 * parallèles d'un réseau) : leur condition est évaluée une seule fois, avant la première
	 * écriture, pour qu'une bobine ne voie pas ce que la précédente vient d'écrire.
	 */
	private static collectCoilGroup(
		assignments: PreCompiledLadderAssignment[],
		start: number,
	): PreCompiledCoilAssignment[] {
		const first = assignments[start];
		if (first.kind !== "coil" || first.reachId === undefined) return [];
		const group: PreCompiledCoilAssignment[] = [];
		for (let index = start; index < assignments.length; index++) {
			const assignment = assignments[index];
			if (assignment.kind !== "coil" || assignment.reachId !== first.reachId)
				break;
			group.push(assignment);
		}
		return group;
	}

	private static compileCoilGroup(group: PreCompiledCoilAssignment[]): ASTNode {
		const write = (assignment: PreCompiledCoilAssignment, value: boolean) =>
			StatementsBuilder.buildAssignStatementNode(
				IdentifiersBuilder.buildIdentifierNode(assignment.variable),
				LiteralsBuilder.buildBooleanNode(value),
			);
		const trueBranch: ASTNode[] = [];
		const falseBranch: ASTNode[] = [];
		for (const assignment of group) {
			if (assignment.mode === "normal") {
				trueBranch.push(write(assignment, !assignment.inverted));
				falseBranch.push(write(assignment, Boolean(assignment.inverted)));
			} else {
				trueBranch.push(write(assignment, assignment.mode === "set"));
			}
		}
		return ControlsBuilder.buildIfControlNode(
			group[0].reach!,
			trueBranch,
			falseBranch.length > 0 ? falseBranch : null,
		);
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
