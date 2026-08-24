import { Dialect } from "@/expression-language/dialect.enum";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { PreCompiledProgram } from "@/project-pre-compiler/pre-compiled-program";
import ProjectPreCompilerError, {
	ProjectPreCompilerErrorSourceBuilder,
} from "@/project-pre-compiler/project.pre-compiler.error";
import {
	getBlockPortVariableMnemonic,
	getContactMemoryVariableMnemonic,
} from "@/project-analyser/analysers/ladder/ladder.analyser";
import { BLOCK_PORT_LABELS, BlockElement } from "@/schemas/ladder/block.schema";
import Connection from "@/schemas/ladder/connection.schema";
import Ladder, { LadderRole } from "@/schemas/ladder/ladder.schema";
import { CoilMode, ContactElement, LadderElement } from "@/schemas/ladder/element.schema";
import PLCVariable from "@/simulator/core/plc/plc-variable";

export type PreCompiledCoilAssignment = {
	kind: "coil";
	coilId: string;
	variable: string;
	mode: CoilMode;
	condition: ASTNode;
};

/**
 * Affecte la variable mémoire générée d'un port de bloc (voir `getBlockPortVariableMnemonic`).
 * Contrairement à `edgeMemoUpdates`, l'ordre de ces affectations dans `assignments` est
 * impératif : un port `ENO` peut être lu par un élément plus loin sur la même ligne (`reach`),
 * qui doit donc voir sa valeur de ce même balayage, pas celle du balayage précédent.
 */
export type PreCompiledBlockPortAssignment = {
	kind: "blockPort";
	blockId: string;
	mnemonic: string;
	value: ASTNode;
};

export type PreCompiledLadderAssignment = PreCompiledCoilAssignment | PreCompiledBlockPortAssignment;

export type PreCompiledEdgeMemoUpdate = {
	contactId: string;
	memoIdentifier: IdentifierNode;
	sourceIdentifier: IdentifierNode;
};

/**
 * Un bloc `"user-program"` appelle le programme référencé quand la variable mémoire de son port
 * `EN` (`enMnemonic`) est vraie — voir `PLCRoutine`, qui résout `programId` à l'exécution via le
 * registre des routines du projet.
 */
export type PreCompiledBlockCall = {
	blockId: string;
	programId: string;
	enMnemonic: string;
};

/**
 * Tout le pré-compilé d'un ladder : une affectation par bobine et par port de bloc (dans l'ordre
 * de lecture du réseau, voir `PreCompiledBlockPortAssignment`), une mise à jour de variable
 * mémoire par contact P/N, et un appel par bloc `"user-program"`. `role` voyage jusqu'au
 * compilateur, qui l'utilise pour savoir si ce ladder est le point d'entrée (le Main) ou un
 * ladder appelé.
 */
export type PreCompiledLadder = {
	type: "ladder";
	role: LadderRole;
	assignments: PreCompiledLadderAssignment[];
	edgeMemoUpdates: PreCompiledEdgeMemoUpdate[];
	blockCalls: PreCompiledBlockCall[];
};

/**
 * Rétrécit un programme pré-compilé opaque vers sa forme Ladder.
 */
export function isPreCompiledLadder(program: PreCompiledProgram): program is PreCompiledLadder {
	return program.type === "ladder";
}

function mergeAnd(a: ASTNode | null, b: ASTNode): ASTNode {
	return a === null ? b : ExpressionsBuilder.buildLogicalExpressionNode("AND", a, b);
}

function mergeOr(conditions: ASTNode[]): ASTNode | null {
	if (conditions.length === 0) return null;
	if (conditions.length === 1) return conditions[0];
	return ExpressionsBuilder.buildChainedLogicalExpressionNode("OR", conditions);
}

function buildContactExpressionNode(contact: ContactElement): ASTNode {
	const variableNode = IdentifiersBuilder.buildIdentifierNode(contact.data.variable);
	if (contact.data.mode === "NO") return variableNode;
	if (contact.data.mode === "NF") return ExpressionsBuilder.buildUnaryExpressionNode("NOT", variableNode);
	const memoNode = IdentifiersBuilder.buildIdentifierNode(getContactMemoryVariableMnemonic(contact.id));
	// P (front montant) : variable ET NON mémoire ; N (front descendant) : NON variable ET mémoire
	return contact.data.mode === "P"
		? ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				variableNode,
				ExpressionsBuilder.buildUnaryExpressionNode("NOT", memoNode),
			)
		: ExpressionsBuilder.buildLogicalExpressionNode(
				"AND",
				ExpressionsBuilder.buildUnaryExpressionNode("NOT", variableNode),
				memoNode,
			);
}

function buildBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
): { assignments: PreCompiledBlockPortAssignment[]; call: PreCompiledBlockCall; propagated: ASTNode } {
	const ports = BLOCK_PORT_LABELS[block.data.blockType];
	const enMnemonic = getBlockPortVariableMnemonic(block.id, ports.input);
	const enoMnemonic = getBlockPortVariableMnemonic(block.id, ports.output);

	return {
		assignments: [
			{
				kind: "blockPort",
				blockId: block.id,
				mnemonic: enMnemonic,
				value: reach ?? LiteralsBuilder.buildBooleanNode(true),
			},
			// ENO d'un appel de programme utilisateur vaut toujours vrai : le bloc ne bloque jamais
			// le rail, seul EN gate l'appel (voir la conversation d'origine).
			{ kind: "blockPort", blockId: block.id, mnemonic: enoMnemonic, value: LiteralsBuilder.buildBooleanNode(true) },
		],
		call: { blockId: block.id, programId: block.data.params.programId, enMnemonic },
		propagated: IdentifiersBuilder.buildIdentifierNode(enoMnemonic),
	};
}

/**
 * Calcule, dans l'ordre de lecture du réseau, les affectations de bobines et de ports de bloc —
 * en remontant le graphe `elements`/`connections` colonne par colonne (garanti croissant le long
 * de toute connexion, donc sans cycle, voir `ConnectionsAddCommand`). Pour chaque élément,
 * `reach` est le OU des conditions accumulées de ses connexions entrantes (`null` = aucune —
 * élément orphelin, normalement signalé par l'analyseur avant compilation) ; une borne
 * d'alimentation propage toujours `true` (racine du graphe), un contact propage `reach ET sa
 * propre expression` aux éléments suivants, une bobine reçoit directement `reach` comme
 * condition compilée. Un bloc matérialise `reach` dans la variable mémoire de son port d'entrée
 * (`EN`) et propage la variable mémoire de son port de sortie (`ENO`) — voir
 * `buildBlockAssignments` — pour que les éléments suivants n'aient qu'à la lire, plutôt que de
 * réembarquer toute l'expression amont.
 */
function computeNetworkAssignments(
	elements: LadderElement[],
	connections: Connection[],
): { assignments: PreCompiledLadderAssignment[]; blockCalls: PreCompiledBlockCall[] } {
	const incomingByTarget = new Map<string, Connection[]>();
	for (const connection of connections) {
		const list = incomingByTarget.get(connection.target.id) ?? [];
		list.push(connection);
		incomingByTarget.set(connection.target.id, list);
	}

	const sortedByColumn = [...elements].sort((a, b) => a.position.col - b.position.col);
	const passThroughById = new Map<string, ASTNode>();
	const assignments: PreCompiledLadderAssignment[] = [];
	const blockCalls: PreCompiledBlockCall[] = [];

	for (const element of sortedByColumn) {
		const incoming = incomingByTarget.get(element.id) ?? [];
		const reach = mergeOr(incoming.map((connection) => passThroughById.get(connection.source.id)!));

		if (element.type === "coil") {
			assignments.push({
				kind: "coil",
				coilId: element.id,
				variable: element.data.variable,
				mode: element.data.mode,
				condition: reach ?? LiteralsBuilder.buildBooleanNode(true),
			});
		} else if (element.type === "railTerminal") {
			// Racine du graphe (jamais de connexion entrante) : toujours sous tension.
			passThroughById.set(element.id, LiteralsBuilder.buildBooleanNode(true));
		} else if (element.type === "block") {
			const { assignments: blockAssignments, call, propagated } = buildBlockAssignments(element, reach);
			assignments.push(...blockAssignments);
			if (call) blockCalls.push(call);
			passThroughById.set(element.id, propagated);
		} else {
			passThroughById.set(element.id, mergeAnd(reach, buildContactExpressionNode(element)));
		}
	}

	return { assignments, blockCalls };
}

export default class LadderPreCompiler {
	static preCompile(
		ladder: Ladder,
		_variables: PLCVariable[],
		_dialect: Dialect,
		errors: ProjectPreCompilerError[],
	): PreCompiledLadder {
		const assignments: PreCompiledLadderAssignment[] = [];
		const edgeMemoUpdates: PreCompiledEdgeMemoUpdate[] = [];
		const blockCalls: PreCompiledBlockCall[] = [];

		for (const section of ladder.sections) {
			try {
				const networkResult = computeNetworkAssignments(section.elements, section.connections);
				assignments.push(...networkResult.assignments);
				blockCalls.push(...networkResult.blockCalls);
				for (const element of section.elements) {
					if (element.type === "contact" && (element.data.mode === "P" || element.data.mode === "N")) {
						edgeMemoUpdates.push({
							contactId: element.id,
							memoIdentifier: IdentifiersBuilder.buildIdentifierNode(
								getContactMemoryVariableMnemonic(element.id),
							),
							sourceIdentifier: IdentifiersBuilder.buildIdentifierNode(element.data.variable),
						});
					}
				}
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				const source = ProjectPreCompilerErrorSourceBuilder.buildLadderNetworkSource(section.id);
				errors.push(e instanceof ProjectPreCompilerError ? e : new ProjectPreCompilerError(source, message));
			}
		}

		return { type: "ladder", role: ladder.role, assignments, edgeMemoUpdates, blockCalls };
	}
}
