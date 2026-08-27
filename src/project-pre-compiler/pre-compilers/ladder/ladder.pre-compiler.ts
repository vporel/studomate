import { Dialect } from "@/expression-language/dialect.enum";
import BlocksBuilder from "@/expression-language/ast/builders/blocks.builder";
import ControlsBuilder from "@/expression-language/ast/builders/controls.builder";
import ExpressionsBuilder from "@/expression-language/ast/builders/expressions.builder";
import IdentifiersBuilder from "@/expression-language/ast/builders/identifiers.builder";
import LiteralsBuilder from "@/expression-language/ast/builders/literals.builder";
import StatementsBuilder from "@/expression-language/ast/builders/statements.builder";
import { ASTNode } from "@/expression-language/ast/nodes/ast-node";
import { CounterNode, TimerNode } from "@/expression-language/ast/nodes/blocks";
import { IfControlNode } from "@/expression-language/ast/nodes/controls";
import { IdentifierNode } from "@/expression-language/ast/nodes/identifiers";
import { parseNumberLiteral } from "@/expression-language/literals/number";
import { parseExpressionCached } from "@/expression-language/parse-expression-cached";
import { parseTimeLiteral } from "@/expression-language/literals/time";
import SimplifierVisitor from "@/expression-language/interpreter/simplifier/simplifier.visitor";
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
import {
	CoilMode,
	ContactElement,
	LadderElement,
} from "@/schemas/ladder/element.schema";
import { getCounterBlockVariableMnemonics } from "@/schemas/function-blocks/counter.schema";
import { getTimerBlockVariableMnemonics } from "@/schemas/function-blocks/timer.schema";
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

/** Un `TimerNode` par bloc `"timer"`, embarqué tel quel parmi les autres instructions (voir
 * `LadderCompiler.compileAssignment`) : il est évalué pour ses effets de bord (écrit `lastInput`,
 * `elapsedTime`/`ET` et `output`/`Q` dans l'environnement) exactement comme `TimerNodeEvaluator`
 * le fait déjà côté GRAFCET. */
export type PreCompiledTimerAssignment = {
	kind: "timer";
	blockId: string;
	node: TimerNode;
};

/** Même principe que `PreCompiledTimerAssignment`, pour un bloc `"counter"` — voir
 * `CounterNodeEvaluator`. */
export type PreCompiledCounterAssignment = {
	kind: "counter";
	blockId: string;
	node: CounterNode;
};

/** Un `IfControlNode` par bloc `"assign"` (`IF <EN> THEN <affectation>`), embarqué tel quel comme
 * un timer/compteur — voir `buildAssignBlockAssignments`. */
export type PreCompiledAssignBlockAssignment = {
	kind: "assign";
	blockId: string;
	node: IfControlNode;
};

export type PreCompiledLadderAssignment =
	| PreCompiledCoilAssignment
	| PreCompiledBlockPortAssignment
	| PreCompiledTimerAssignment
	| PreCompiledCounterAssignment
	| PreCompiledAssignBlockAssignment;

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
 * mémoire par contact P/N, un appel par bloc `"user-program"`, un `TimerNode` par bloc `"timer"`
 * et un `CounterNode` par bloc `"counter"` — chacun évalué pour ses effets de bord comme tout
 * autre nœud (même mécanisme que côté GRAFCET pour les timers). `role` voyage jusqu'au
 * compilateur, qui l'utilise pour savoir si ce ladder est le point d'entrée (le Main) ou un
 * ladder appelé.
 */
export type PreCompiledLadder = {
	type: "ladder";
	role: LadderRole;
	assignments: PreCompiledLadderAssignment[];
	edgeMemoUpdates: PreCompiledEdgeMemoUpdate[];
	blockCalls: PreCompiledBlockCall[];
	timers: TimerNode[];
	counters: CounterNode[];
};

/**
 * Rétrécit un programme pré-compilé opaque vers sa forme Ladder.
 */
export function isPreCompiledLadder(
	program: PreCompiledProgram,
): program is PreCompiledLadder {
	return program.type === "ladder";
}

function mergeAnd(a: ASTNode | null, b: ASTNode): ASTNode {
	return a === null
		? b
		: ExpressionsBuilder.buildLogicalExpressionNode("AND", a, b);
}

function mergeOr(conditions: ASTNode[]): ASTNode | null {
	if (conditions.length === 0) return null;
	if (conditions.length === 1) return conditions[0];
	return ExpressionsBuilder.buildChainedLogicalExpressionNode("OR", conditions);
}

function buildContactExpressionNode(contact: ContactElement): ASTNode {
	const variableNode = IdentifiersBuilder.buildIdentifierNode(
		contact.data.variable,
	);
	if (contact.data.mode === "NO") return variableNode;
	if (contact.data.mode === "NF")
		return ExpressionsBuilder.buildUnaryExpressionNode("NOT", variableNode);
	const memoNode = IdentifiersBuilder.buildIdentifierNode(
		getContactMemoryVariableMnemonic(contact.id),
	);
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

type BuiltBlockAssignments = {
	assignments: PreCompiledLadderAssignment[];
	call: PreCompiledBlockCall | null;
	propagated: ASTNode;
};

function buildUserProgramBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
): BuiltBlockAssignments {
	if (block.data.blockType !== "user-program")
		throw new Error("Bloc non user-program");
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
			// le rail, seul EN gate l'appel.
			{
				kind: "blockPort",
				blockId: block.id,
				mnemonic: enoMnemonic,
				value: LiteralsBuilder.buildBooleanNode(true),
			},
		],
		call: {
			blockId: block.id,
			programId: block.data.params.programId,
			enMnemonic,
		},
		propagated: IdentifiersBuilder.buildIdentifierNode(enoMnemonic),
	};
}

/** `pt` est soit une constante `T#...` (littéral en ms), soit le mnémonique d'une variable
 * existante, dont la valeur est déjà en ms qu'elle soit TIME ou numérique. */
function buildPresetTimeNode(pt: string): ASTNode {
	const literalMs = parseTimeLiteral(pt);
	if (literalMs !== null) return LiteralsBuilder.buildNumberNode(literalMs);
	return IdentifiersBuilder.buildIdentifierNode(pt);
}

/**
 * Un bloc `"timer"` n'appelle rien : il matérialise un `TimerNode` (voir `PreCompiledTimerAssignment`)
 * référençant directement les variables générées à partir de sa config (`<Nom>.IN/.Q/.ET`, voir
 * `createTimerBlockVariables`), plus une variable cachée pour la détection de front
 * (`getBlockPortVariableMnemonic(block.id, "lastInput")`, générée par `LadderAnalyser`). Si la
 * pinoche ET référence une variable, sa valeur y est recopiée juste après, dans le même ordre.
 */
function buildTimerBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
): BuiltBlockAssignments {
	if (block.data.blockType !== "timer") throw new Error("Bloc non timer");
	const { name, timerType, pt, et } = block.data.params;
	const mnemonics = getTimerBlockVariableMnemonics(name);
	const lastInputMnemonic = getBlockPortVariableMnemonic(block.id, "lastInput");

	const assignments: PreCompiledLadderAssignment[] = [
		{
			kind: "blockPort",
			blockId: block.id,
			mnemonic: mnemonics.IN,
			value: reach ?? LiteralsBuilder.buildBooleanNode(true),
		},
		{
			kind: "timer",
			blockId: block.id,
			node: BlocksBuilder.buildTimerNode(
				timerType,
				IdentifiersBuilder.buildIdentifierNode(mnemonics.IN),
				IdentifiersBuilder.buildIdentifierNode(lastInputMnemonic),
				buildPresetTimeNode(pt),
				IdentifiersBuilder.buildIdentifierNode(mnemonics.ET),
				IdentifiersBuilder.buildIdentifierNode(mnemonics.Q),
			),
		},
	];
	if (et) {
		assignments.push({
			kind: "blockPort",
			blockId: block.id,
			mnemonic: et,
			value: IdentifiersBuilder.buildIdentifierNode(mnemonics.ET),
		});
	}

	return {
		assignments,
		call: null,
		propagated: IdentifiersBuilder.buildIdentifierNode(mnemonics.Q),
	};
}

/** `pv` est soit un littéral numérique brut, soit le mnémonique d'une variable existante. */
function buildPresetValueNode(pv: string): ASTNode {
	const literal = parseNumberLiteral(pv);
	if (literal !== null) return LiteralsBuilder.buildNumberNode(literal);
	return IdentifiersBuilder.buildIdentifierNode(pv);
}

/**
 * Un bloc `"counter"` n'appelle rien : il matérialise un `CounterNode` (voir
 * `PreCompiledCounterAssignment`) référençant directement les variables générées à partir de sa
 * config (`<Nom>.IN`/`.CD`/`.Q`/`.CV`, voir `createCounterBlockVariables`) — contrairement au
 * timer, aucune variable cachée n'est nécessaire : `input`/`control` sont évalués en niveau, pas
 * en front. Si la pinoche CV référence une variable, sa valeur y est recopiée juste après.
 */
function buildCounterBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
): BuiltBlockAssignments {
	if (block.data.blockType !== "counter") throw new Error("Bloc non counter");
	const { name, counterType, control, pv, cv } = block.data.params;
	const mnemonics = getCounterBlockVariableMnemonics(name, counterType);
	const pulseMnemonic = counterType === "CTU" ? mnemonics.IN : mnemonics.CD;

	const assignments: PreCompiledLadderAssignment[] = [
		{
			kind: "blockPort",
			blockId: block.id,
			mnemonic: pulseMnemonic,
			value: reach ?? LiteralsBuilder.buildBooleanNode(true),
		},
		{
			kind: "counter",
			blockId: block.id,
			node: BlocksBuilder.buildCounterNode(
				counterType,
				IdentifiersBuilder.buildIdentifierNode(pulseMnemonic),
				IdentifiersBuilder.buildIdentifierNode(control),
				buildPresetValueNode(pv),
				IdentifiersBuilder.buildIdentifierNode(mnemonics.CV),
				IdentifiersBuilder.buildIdentifierNode(mnemonics.Q),
			),
		},
	];
	if (cv) {
		assignments.push({
			kind: "blockPort",
			blockId: block.id,
			mnemonic: cv,
			value: IdentifiersBuilder.buildIdentifierNode(mnemonics.CV),
		});
	}

	return {
		assignments,
		call: null,
		propagated: IdentifiersBuilder.buildIdentifierNode(mnemonics.Q),
	};
}

/**
 * Un bloc `"compare"` n'appelle rien et ne matérialise aucun `ASTNode` propre (contrairement au
 * timer/compteur) : ses deux pinoches IN1/IN2 sont reparsées comme opérandes puis combinées en
 * `IN1 <operator> IN2` (voir `CompareBlockAnalyser`, qui garantit la validité avant compilation),
 * directement affecté à la variable mémoire cachée de son port `Q` — combiné en ET avec `IN`
 * (Q = IN ET comparaison), comme une bobine ordinaire recevrait sa condition. Ni les opérandes ni
 * leur analyse ne sont mis en cache entre l'analyseur et le pré-compilateur — chacun relit/reparse
 * le texte brut indépendamment, comme pour une transition GRAFCET.
 */
function buildCompareBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
	dialect: Dialect,
): BuiltBlockAssignments {
	if (block.data.blockType !== "compare") throw new Error("Bloc non compare");
	const ports = BLOCK_PORT_LABELS["compare"];
	const inMnemonic = getBlockPortVariableMnemonic(block.id, ports.input);
	const qMnemonic = getBlockPortVariableMnemonic(block.id, ports.output);

	const { in1, in2, operator } = block.data.params;
	const expressionNode = new SimplifierVisitor().visit(
		ExpressionsBuilder.buildComparisonExpressionNode(
			operator,
			parseExpressionCached(in1, dialect).ast,
			parseExpressionCached(in2, dialect).ast,
		),
	);

	return {
		assignments: [
			{
				kind: "blockPort",
				blockId: block.id,
				mnemonic: inMnemonic,
				value: reach ?? LiteralsBuilder.buildBooleanNode(true),
			},
			{
				kind: "blockPort",
				blockId: block.id,
				mnemonic: qMnemonic,
				value: ExpressionsBuilder.buildLogicalExpressionNode(
					"AND",
					IdentifiersBuilder.buildIdentifierNode(inMnemonic),
					expressionNode,
				),
			},
		],
		call: null,
		propagated: IdentifiersBuilder.buildIdentifierNode(qMnemonic),
	};
}

/**
 * `"assign"` (`out := in`) et `"arithmetic"` (`out := in1 <op> in2`) partagent le même moule :
 * une affectation exécutée seulement quand `EN` est vrai (`IF <EN> THEN …`, voir
 * `PreCompiledAssignBlockAssignment`), `ENO` toujours vrai — l'affectation n'est jamais elle-même
 * une condition pour le rail (comme ENO d'un appel de programme utilisateur). Le membre droit est
 * reconstruit depuis les pinoches (jamais reparsé comme une expression opaque).
 */
function buildAssignmentGatedByEn(
	block: BlockElement,
	reach: ASTNode | null,
	target: string,
	rightHandSide: ASTNode,
): BuiltBlockAssignments {
	const ports = BLOCK_PORT_LABELS[block.data.blockType];
	const enMnemonic = getBlockPortVariableMnemonic(block.id, ports.input);
	const enoMnemonic = getBlockPortVariableMnemonic(block.id, ports.output);

	const assignmentNode = new SimplifierVisitor().visit(
		StatementsBuilder.buildAssignStatementNode(
			IdentifiersBuilder.buildIdentifierNode(target),
			rightHandSide,
		),
	);

	return {
		assignments: [
			{
				kind: "blockPort",
				blockId: block.id,
				mnemonic: enMnemonic,
				value: reach ?? LiteralsBuilder.buildBooleanNode(true),
			},
			{
				kind: "assign",
				blockId: block.id,
				node: ControlsBuilder.buildIfControlNode(
					IdentifiersBuilder.buildIdentifierNode(enMnemonic),
					[assignmentNode],
					null,
				),
			},
			{
				kind: "blockPort",
				blockId: block.id,
				mnemonic: enoMnemonic,
				value: LiteralsBuilder.buildBooleanNode(true),
			},
		],
		call: null,
		propagated: IdentifiersBuilder.buildIdentifierNode(enoMnemonic),
	};
}

function buildAssignBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
	dialect: Dialect,
): BuiltBlockAssignments {
	if (block.data.blockType !== "assign") throw new Error("Bloc non assign");
	return buildAssignmentGatedByEn(
		block,
		reach,
		block.data.params.out,
		parseExpressionCached(block.data.params.in, dialect).ast,
	);
}

function buildArithmeticBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
	dialect: Dialect,
): BuiltBlockAssignments {
	if (block.data.blockType !== "arithmetic")
		throw new Error("Bloc non arithmetic");
	const { in1, in2, out, operator } = block.data.params;
	return buildAssignmentGatedByEn(
		block,
		reach,
		out,
		ExpressionsBuilder.buildArithmeticExpressionNode(
			operator,
			parseExpressionCached(in1, dialect).ast,
			parseExpressionCached(in2, dialect).ast,
		),
	);
}

function buildBlockAssignments(
	block: BlockElement,
	reach: ASTNode | null,
	dialect: Dialect,
): BuiltBlockAssignments {
	if (block.data.blockType === "user-program")
		return buildUserProgramBlockAssignments(block, reach);
	if (block.data.blockType === "counter")
		return buildCounterBlockAssignments(block, reach);
	if (block.data.blockType === "compare")
		return buildCompareBlockAssignments(block, reach, dialect);
	if (block.data.blockType === "assign")
		return buildAssignBlockAssignments(block, reach, dialect);
	if (block.data.blockType === "arithmetic")
		return buildArithmeticBlockAssignments(block, reach, dialect);
	return buildTimerBlockAssignments(block, reach);
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
	dialect: Dialect,
): {
	assignments: PreCompiledLadderAssignment[];
	blockCalls: PreCompiledBlockCall[];
} {
	const incomingByTarget = new Map<string, Connection[]>();
	for (const connection of connections) {
		const list = incomingByTarget.get(connection.target.id) ?? [];
		list.push(connection);
		incomingByTarget.set(connection.target.id, list);
	}

	const sortedByColumn = [...elements].sort(
		(a, b) => a.position.col - b.position.col,
	);
	const passThroughById = new Map<string, ASTNode>();
	const assignments: PreCompiledLadderAssignment[] = [];
	const blockCalls: PreCompiledBlockCall[] = [];

	for (const element of sortedByColumn) {
		const incoming = incomingByTarget.get(element.id) ?? [];
		const reach = mergeOr(
			incoming.map((connection) => {
				const sourceReach = passThroughById.get(connection.source.id);
				// La source d'une connexion doit toujours avoir été traitée avant sa cible (voir le
				// commentaire de fonction) : ce cas ne devrait jamais se produire pour un réseau déjà
				// validé par `LadderAnalyser.checkConnectionColumnOrder`, mais un projet importé/édité
				// à la main pourrait l'atteindre malgré tout.
				if (!sourceReach) {
					throw new Error(
						`Ordre de colonnes invalide : l'élément "${connection.source.id}" n'a pas encore été résolu quand sa connexion vers "${element.id}" est traitée.`,
					);
				}
				return sourceReach;
			}),
		);

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
			const {
				assignments: blockAssignments,
				call,
				propagated,
			} = buildBlockAssignments(element, reach, dialect);
			assignments.push(...blockAssignments);
			if (call) blockCalls.push(call);
			passThroughById.set(element.id, propagated);
		} else {
			passThroughById.set(
				element.id,
				mergeAnd(reach, buildContactExpressionNode(element)),
			);
		}
	}

	return { assignments, blockCalls };
}

export default class LadderPreCompiler {
	static preCompile(
		ladder: Ladder,
		_variables: PLCVariable[],
		dialect: Dialect,
		errors: ProjectPreCompilerError[],
	): PreCompiledLadder {
		const assignments: PreCompiledLadderAssignment[] = [];
		const edgeMemoUpdates: PreCompiledEdgeMemoUpdate[] = [];
		const blockCalls: PreCompiledBlockCall[] = [];

		for (const section of ladder.sections) {
			try {
				const networkResult = computeNetworkAssignments(
					section.elements,
					section.connections,
					dialect,
				);
				assignments.push(...networkResult.assignments);
				blockCalls.push(...networkResult.blockCalls);
				for (const element of section.elements) {
					if (
						element.type === "contact" &&
						(element.data.mode === "P" || element.data.mode === "N")
					) {
						edgeMemoUpdates.push({
							contactId: element.id,
							memoIdentifier: IdentifiersBuilder.buildIdentifierNode(
								getContactMemoryVariableMnemonic(element.id),
							),
							sourceIdentifier: IdentifiersBuilder.buildIdentifierNode(
								element.data.variable,
							),
						});
					}
				}
			} catch (e) {
				const message = e instanceof Error ? e.message : String(e);
				const source =
					ProjectPreCompilerErrorSourceBuilder.buildLadderNetworkSource(
						section.id,
					);
				errors.push(
					e instanceof ProjectPreCompilerError
						? e
						: new ProjectPreCompilerError(source, message),
				);
			}
		}

		const timers = assignments
			.filter(
				(assignment): assignment is PreCompiledTimerAssignment =>
					assignment.kind === "timer",
			)
			.map((assignment) => assignment.node);
		const counters = assignments
			.filter(
				(assignment): assignment is PreCompiledCounterAssignment =>
					assignment.kind === "counter",
			)
			.map((assignment) => assignment.node);

		return {
			type: "ladder",
			role: ladder.role,
			assignments,
			edgeMemoUpdates,
			blockCalls,
			timers,
			counters,
		};
	}
}
