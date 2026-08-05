import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { TimerNode } from "@/expression-language/ast/nodes/blocks";
import {
	PreCompiledCoilAssignment,
	PreCompiledLadder,
} from "@/project-pre-compiler/pre-compilers/ladder/ladder.pre-compiler";

export type CompiledLadder = {
	nodes: ASTNode[];
	timers: TimerNode[];
};

export default class LadderCompiler {
	/**
	 * Une instruction par bobine, puis une instruction par mise à jour de variable mémoire de
	 * contact P/N. L'ordre des bobines suit l'ordre d'aplatissement des sections/réseaux (déjà
	 * garanti par `LadderPreCompiler`) — sémantique de scan séquentielle à effet immédiat.
	 */
	static compile(preCompiledLadder: PreCompiledLadder): CompiledLadder {
		const nodes: ASTNode[] = [
			...preCompiledLadder.coilAssignments.map((assignment) => this.compileCoilAssignment(assignment)),
			...preCompiledLadder.edgeMemoUpdates.map((update) =>
				StatementsBuilder.buildAssignStatementNode(update.memoIdentifier, update.sourceIdentifier),
			),
		];

		return { nodes, timers: [] };
	}

	private static compileCoilAssignment(assignment: PreCompiledCoilAssignment): ASTNode {
		const coilIdentifier = IdentifiersBuilder.buildIdentifierNode(assignment.variable);

		if (assignment.mode === "normal") {
			return StatementsBuilder.buildAssignStatementNode(coilIdentifier, assignment.condition);
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
