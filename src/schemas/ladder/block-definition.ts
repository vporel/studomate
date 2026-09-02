import type { ArithmeticOperator } from "@/expression-language/operators";
import {
	COUNTER_TYPES,
	CounterType,
	createCounterBlockElement,
	createCounterBlockVariables,
	getCounterPortSpecs,
	readCounterParam,
	writeCounterParam,
} from "./function-blocks/counter.schema";
import {
	TIMER_PORT_SPECS,
	TIMER_TYPES,
	TimerType,
	createTimerBlockElement,
	createTimerBlockVariables,
	readTimerParam,
	writeTimerParam,
} from "./function-blocks/timer.schema";
import Variable from "../variable/variable.schema";
import { BlockPortSpec, getBlockHeightInCells } from "./block-port.schema";
import {
	ARITHMETIC_BLOCK_OPERATORS,
	ARITHMETIC_PORT_SPECS,
	ASSIGN_PORT_SPECS,
	ArithmeticBlockParams,
	AssignBlockParams,
	BlockData,
	BlockElement,
	BlockPortLabels,
	BlockType,
	COMPARE_PORT_SPECS,
	CompareBlockParams,
	CounterBlockParams,
	TimerBlockParams,
	USER_PROGRAM_PORT_SPECS,
	UserProgramBlockParams,
	createArithmeticBlockElement,
	createAssignBlockElement,
	createCompareBlockElement,
	createUserProgramBlockElement,
	readArithmeticParam,
	readAssignParam,
	writeArithmeticParam,
	writeAssignParam,
} from "./block.schema";

type Params = BlockData["params"];

/**
 * Tout ce que les couches génériques (rendu du nœud, drop, géométrie de grille) ont besoin de
 * savoir d'une famille de bloc, en **une seule source de vérité de domaine**. Ne porte que de la
 * donnée : pas de fonction d'analyse ni de pré-compilation (le domaine ne dépend pas de ces
 * couches — chacune garde sa propre table `Record<BlockType, …>`).
 *
 * `Record<BlockType, BlockDefinition>` casse la compilation tant qu'une famille manque : c'est le
 * garde-fou qui remplace les chaînes de `if (blockType === …)` disséminées.
 */
export type BlockDefinition = {
	/** Specs des ports du bloc — fonction si elles dépendent d'une variante portée par les params
	 * (compteur CTU/CTD). */
	portSpecs: BlockPortSpec[] | ((params: Params) => BlockPortSpec[]);
	/** Colonnes de grille occupées : 1 comme un contact (compare), 2 pour une vraie boîte. */
	widthInColumns: 1 | 2;
	/** `"box"` : rendu générique `BoxBlockNode`. `"custom"` : composant dédié (compare). */
	render: "box" | "custom";
	createElement: (row: number, col: number, params?: Params) => BlockElement;
	/** Lecture/écriture d'une pinoche paramètre par suffixe — pilote la grille de pinoches de
	 * `BoxBlockNode`. Lève pour un bloc sans pinoche paramètre éditable (compare, user-program) :
	 * ces cas ne rendent aucune ligne de pinoche, l'appel n'arrive jamais. */
	readParam: (params: Params, suffix: string) => string;
	writeParam: (params: Params, suffix: string, value: string) => Params;
	/** `true` si les ports structurels sont de vraies variables exposées `<Nom>.Port` (timer,
	 * compteur), `false` si ce sont des variables mémoire cachées générées par l'analyseur. */
	portsAreExposedVariables: boolean;
	/** Les `Variable` exposées générées à partir de la config du bloc — présent ssi
	 * `portsAreExposedVariables`. */
	exposedVariables?: (elementId: string, params: Params) => Variable[];
	/** `true` si un libellé fixe s'affiche dans la boîte (assign, arithmetic) ; le texte lui-même
	 * est porté côté UI (`BLOCK_NODE_UI`). `false` : libellé porté ailleurs (nom du bloc pour
	 * timer/compteur, nom du programme pour user-program). */
	hasStaticLabel: boolean;
	/** Sélecteur affiché dans la boîte, le cas échéant : opérateur (arithmetic), variante
	 * (timer/counter). Édité en place sur le nœud, pas de fenêtre de configuration. Le libellé
	 * d'accessibilité est porté côté UI (`BLOCK_NODE_UI`). */
	inlineSelect?: {
		values: readonly string[];
		read: (params: Params) => string;
		write: (params: Params, value: string) => Params;
	};
};

function noParamRead(): string {
	throw new Error("Ce bloc n'a pas de pinoche paramètre éditable.");
}

function noParamWrite(): Params {
	throw new Error("Ce bloc n'a pas de pinoche paramètre éditable.");
}

export const BLOCK_DEFINITIONS: Record<BlockType, BlockDefinition> = {
	"user-program": {
		portSpecs: USER_PROGRAM_PORT_SPECS,
		widthInColumns: 2,
		render: "box",
		createElement: (row, col, params) =>
			createUserProgramBlockElement(
				(params as UserProgramBlockParams).programId,
				row,
				col,
			),
		readParam: noParamRead,
		writeParam: noParamWrite,
		portsAreExposedVariables: false,
		hasStaticLabel: false,
	},
	timer: {
		portSpecs: TIMER_PORT_SPECS,
		widthInColumns: 2,
		render: "box",
		createElement: (row, col, params) =>
			createTimerBlockElement(params as TimerBlockParams, row, col),
		readParam: (params, suffix) => readTimerParam(params as TimerBlockParams, suffix),
		writeParam: (params, suffix, value) =>
			writeTimerParam(params as TimerBlockParams, suffix, value),
		portsAreExposedVariables: true,
		exposedVariables: (elementId, params) =>
			createTimerBlockVariables(elementId, (params as TimerBlockParams).name),
		hasStaticLabel: false,
		inlineSelect: {
			values: TIMER_TYPES,
			read: (params) => (params as TimerBlockParams).timerType,
			write: (params, value) => ({
				...(params as TimerBlockParams),
				timerType: value as TimerType,
			}),
		},
	},
	counter: {
		portSpecs: (params) =>
			getCounterPortSpecs((params as CounterBlockParams).counterType),
		widthInColumns: 2,
		render: "box",
		createElement: (row, col, params) =>
			createCounterBlockElement(params as CounterBlockParams, row, col),
		readParam: (params, suffix) =>
			readCounterParam(params as CounterBlockParams, suffix),
		writeParam: (params, suffix, value) =>
			writeCounterParam(params as CounterBlockParams, suffix, value),
		portsAreExposedVariables: true,
		exposedVariables: (elementId, params) =>
			createCounterBlockVariables(
				elementId,
				(params as CounterBlockParams).name,
				(params as CounterBlockParams).counterType,
			),
		hasStaticLabel: false,
		inlineSelect: {
			values: COUNTER_TYPES,
			read: (params) => (params as CounterBlockParams).counterType,
			write: (params, value) => ({
				...(params as CounterBlockParams),
				counterType: value as CounterType,
			}),
		},
	},
	compare: {
		portSpecs: COMPARE_PORT_SPECS,
		widthInColumns: 1,
		render: "custom",
		createElement: (row, col, params) =>
			createCompareBlockElement(row, col, params as CompareBlockParams | undefined),
		readParam: noParamRead,
		writeParam: noParamWrite,
		portsAreExposedVariables: false,
		hasStaticLabel: false,
	},
	assign: {
		portSpecs: ASSIGN_PORT_SPECS,
		widthInColumns: 2,
		render: "box",
		createElement: (row, col, params) =>
			createAssignBlockElement(row, col, params as AssignBlockParams | undefined),
		readParam: (params, suffix) => readAssignParam(params as AssignBlockParams, suffix),
		writeParam: (params, suffix, value) =>
			writeAssignParam(params as AssignBlockParams, suffix, value),
		portsAreExposedVariables: false,
		hasStaticLabel: true,
	},
	arithmetic: {
		portSpecs: ARITHMETIC_PORT_SPECS,
		widthInColumns: 2,
		render: "box",
		createElement: (row, col, params) =>
			createArithmeticBlockElement(
				row,
				col,
				params as ArithmeticBlockParams | undefined,
			),
		readParam: (params, suffix) =>
			readArithmeticParam(params as ArithmeticBlockParams, suffix),
		writeParam: (params, suffix, value) =>
			writeArithmeticParam(params as ArithmeticBlockParams, suffix, value),
		portsAreExposedVariables: false,
		hasStaticLabel: true,
		inlineSelect: {
			values: ARITHMETIC_BLOCK_OPERATORS,
			read: (params) => (params as ArithmeticBlockParams).operator,
			write: (params, value) => ({
				...(params as ArithmeticBlockParams),
				operator: value as ArithmeticOperator,
			}),
		},
	},
};

/** Les specs de ports d'un bloc, variante résolue. */
export function resolvePortSpecs(data: BlockData): BlockPortSpec[] {
	const specs = BLOCK_DEFINITIONS[data.blockType].portSpecs;
	return typeof specs === "function" ? specs(data.params) : specs;
}

/**
 * Noms des deux ports structurels (câblés sur le rail), dérivés des specs — seule source de
 * vérité, gère la variante compteur CTD (`CD`/`Q`) sans cas particulier ailleurs.
 */
export function resolveStructuralPorts(data: BlockData): BlockPortLabels {
	const specs = resolvePortSpecs(data);
	const input = specs.find(
		(spec) => spec.kind === "structural" && spec.direction === "input",
	);
	const output = specs.find(
		(spec) => spec.kind === "structural" && spec.direction === "output",
	);
	if (!input || !output)
		throw new Error(
			`Bloc "${data.blockType}" : ports structurels absents de ses specs.`,
		);
	return { input: input.suffix, output: output.suffix };
}

/** Largeur en colonnes de grille d'un bloc. */
export function getBlockElementWidth(data: BlockData): number {
	return BLOCK_DEFINITIONS[data.blockType].widthInColumns;
}

/** Hauteur en cellules de grille d'un bloc, dérivée de ses specs de ports. */
export function getBlockElementHeight(data: BlockData): number {
	return getBlockHeightInCells(resolvePortSpecs(data));
}
