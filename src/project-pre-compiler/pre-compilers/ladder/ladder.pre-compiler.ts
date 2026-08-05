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
import { getContactMemoryVariableMnemonic } from "@/project-analyser/analysers/ladder/ladder.analyser";
import Connection from "@/schemas/ladder/connection.schema";
import Ladder from "@/schemas/ladder/ladder.schema";
import { CoilElement, CoilMode, ContactElement, LadderElement } from "@/schemas/ladder/element.schema";
import PLCVariable from "@/simulator/core/plc/plc-variable";

export type PreCompiledCoilAssignment = {
	coilId: string;
	variable: string;
	mode: CoilMode;
	condition: ASTNode;
};

export type PreCompiledEdgeMemoUpdate = {
	contactId: string;
	memoIdentifier: IdentifierNode;
	sourceIdentifier: IdentifierNode;
};

/**
 * Tout le pré-compilé d'un ladder : une affectation par bobine (avec sa condition déjà
 * réduite à une expression booléenne), et une mise à jour de variable mémoire par contact P/N.
 */
export type PreCompiledLadder = {
	type: "ladder";
	coilAssignments: PreCompiledCoilAssignment[];
	edgeMemoUpdates: PreCompiledEdgeMemoUpdate[];
};

/**
 * Rétrécit un programme pré-compilé opaque vers sa forme Ladder.
 */
export function isPreCompiledLadder(program: PreCompiledProgram): program is PreCompiledLadder {
	return program.type === "ladder";
}

type CoilCondition = { coil: CoilElement; condition: ASTNode | null };

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

/**
 * Calcule, pour chaque bobine d'une section, la condition booléenne qui l'atteint — en
 * remontant le graphe `elements`/`connections` dans l'ordre des colonnes (garanti croissant le
 * long de toute connexion, donc sans cycle, voir `ConnectionsAddCommand`). Pour chaque élément,
 * `reach` est le OU des conditions accumulées de ses connexions entrantes (`null` = aucune —
 * élément orphelin, normalement signalé par l'analyseur avant compilation) ; une borne
 * d'alimentation propage toujours `true` (racine du graphe), un contact propage `reach ET sa
 * propre expression` aux éléments suivants, une bobine reçoit directement `reach` comme
 * condition compilée.
 */
function computeCoilConditions(elements: LadderElement[], connections: Connection[]): CoilCondition[] {
	const incomingByTarget = new Map<string, Connection[]>();
	for (const connection of connections) {
		const list = incomingByTarget.get(connection.target.id) ?? [];
		list.push(connection);
		incomingByTarget.set(connection.target.id, list);
	}

	const sortedByColumn = [...elements].sort((a, b) => a.position.col - b.position.col);
	const passThroughById = new Map<string, ASTNode>();
	const coilConditions: CoilCondition[] = [];

	for (const element of sortedByColumn) {
		const incoming = incomingByTarget.get(element.id) ?? [];
		const reach = mergeOr(incoming.map((connection) => passThroughById.get(connection.source.id)!));

		if (element.type === "coil") {
			coilConditions.push({ coil: element, condition: reach });
		} else if (element.type === "railTerminal") {
			// Racine du graphe (jamais de connexion entrante) : toujours sous tension.
			passThroughById.set(element.id, LiteralsBuilder.buildBooleanNode(true));
		} else {
			passThroughById.set(element.id, mergeAnd(reach, buildContactExpressionNode(element)));
		}
	}

	return coilConditions;
}

export default class LadderPreCompiler {
	static preCompile(
		ladder: Ladder,
		_variables: PLCVariable[],
		_dialect: Dialect,
		errors: ProjectPreCompilerError[],
	): PreCompiledLadder {
		const coilAssignments: PreCompiledCoilAssignment[] = [];
		const edgeMemoUpdates: PreCompiledEdgeMemoUpdate[] = [];

		for (const section of ladder.sections) {
			try {
				const coilConditions = computeCoilConditions(section.elements, section.connections);
				for (const { coil, condition } of coilConditions) {
					coilAssignments.push({
						coilId: coil.id,
						variable: coil.data.variable,
						mode: coil.data.mode,
						condition: condition ?? LiteralsBuilder.buildBooleanNode(true),
					});
				}
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

		return { type: "ladder", coilAssignments, edgeMemoUpdates };
	}
}
