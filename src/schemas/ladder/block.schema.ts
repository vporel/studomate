import { createRandomId } from "@/ids";
import {
	ARITHMETIC_OPERATORS,
	ArithmeticOperator,
	COMPARISON_OPERATORS,
	ComparisonOperator,
} from "@/expression-language/operators";
import type { CounterType } from "../function-blocks/counter.schema";
import type { TimerType } from "../function-blocks/timer.schema";
import SharedElement from "../shared/element.schema";
import type { BlockPortSpec } from "./block-port.schema";
import type { GridPosition } from "./element.schema";

/**
 * Les types de bloc existants — un par bloc **concret**, jamais une famille générique... sauf
 * `"timer"`/`"counter"` : leurs variantes (TON/TOF/TP, CTU/CTD) partagent le même mécanisme, ce
 * qui vit comme paramètre (`timerType`/`counterType`) sur leurs params plutôt que comme des
 * entrées distinctes ici. Contrairement au timer, les ports structurels d'un compteur dépendent
 * de sa variante (voir `getCounterPortSpecs`) — `BLOCK_PORT_LABELS["counter"]` n'en porte donc
 * qu'un défaut (CTU), à ignorer au profit de `getCounterPortSpecs` partout où la variante réelle
 * est connue (voir `BlockNode`). `"compare"` n'est pas non plus une famille "function block" façon
 * timer/counter : il n'a pas de nom et ne génère aucune variable exposée `<Nom>.Port` — juste ses
 * deux ports structurels génériques (comme `"user-program"`) et deux pinoches d'entrée IN1/IN2
 * `type: "ANY"` (voir `CompareBlockParams`). `"assign"` (`out := in`, gaté par `EN`) et
 * `"arithmetic"` (`out := in1 <op> in2`, gaté par `EN`) suivent le même principe : opérandes
 * simples (variable/littéral) sur les entrées, variable inscriptible sur `out`, ports `EN`/`ENO`
 * comme `"user-program"`.
 */
export const BLOCK_TYPES = [
	"user-program",
	"timer",
	"counter",
	"compare",
	"assign",
	"arithmetic",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockPortLabels = { input: string; output: string };

/**
 * Tout bloc a exactement deux ports d'alimentation structurels — une entrée et une sortie,
 * câblées sur le rail comme un contact. Leurs noms par défaut sont `EN`/`ENO`, personnalisables
 * par type de bloc (`IN`/`Q` pour un bloc timer).
 * Tout autre port propre à un type de bloc (`PT`/`ET` d'un bloc timer) est une "block variable"
 * — pas câblée sur le rail, prédéfinie par le type de bloc, non concernée par ce mécanisme.
 */
export const BLOCK_PORT_LABELS: Record<BlockType, BlockPortLabels> = {
	"user-program": { input: "EN", output: "ENO" },
	timer: { input: "IN", output: "Q" },
	counter: { input: "IN", output: "Q" },
	compare: { input: "IN", output: "Q" },
	assign: { input: "EN", output: "ENO" },
	arithmetic: { input: "EN", output: "ENO" },
};

export type UserProgramBlockParams = { programId: string };

/**
 * Un bloc timer porte sa configuration complète directement dans l'élément — pas de registre
 * séparé au niveau projet : sa création/suppression doit rester une mutation purement ladder-scope
 * pour participer à la pile d'annulation locale de ce ladder (voir `Ladder.findElement`/le
 * pré-compilateur, qui lisent la config directement sur l'élément).
 *
 * `pt` est le contenu brut de la pinoche PT : soit le mnémonique d'une variable existante, soit
 * une constante `T#...`. `et` est le contenu brut de la pinoche ET (optionnelle) : le mnémonique
 * d'une variable existante qui recevra une copie du temps écoulé interne à chaque cycle.
 */
export type TimerBlockParams = {
	name: string;
	timerType: TimerType;
	pt: string;
	et?: string;
};

/**
 * Même principe que `TimerBlockParams`. `control` est le contenu brut de la pinoche R (CTU) ou
 * LD (CTD) : toujours le mnémonique d'une variable booléenne existante, jamais de littéral. `pv`
 * est le contenu brut de la pinoche PV : soit le mnémonique d'une variable numérique existante,
 * soit un littéral numérique brut. `cv` est le contenu brut de la pinoche CV (optionnelle),
 * comme `et` pour un timer : le mnémonique d'une variable existante qui recevra une copie de la
 * valeur courante interne à chaque cycle.
 */
export type CounterBlockParams = {
	name: string;
	counterType: CounterType;
	control: string;
	pv: string;
	cv?: string;
};

/** Les 6 opérateurs d'un bloc `"compare"` — exactement ceux du langage d'expression
 * (`COMPARISON_OPERATORS`), pour éviter une seconde orthographe à faire correspondre lors de la
 * construction de l'AST. L'inégalité s'écrit `!=` (jamais `<>`). */
export const COMPARE_OPERATORS = COMPARISON_OPERATORS;

export type CompareOperator = ComparisonOperator;

/**
 * Un bloc `"compare"` n'a pas de nom : ses ports structurels IN/Q (câblés sur le rail comme
 * `"user-program"`) passent par le mécanisme générique de variables mémoire cachées (voir
 * `LadderAnalyser.buildBlockPortVariables`), pas par des variables exposées `<Nom>.Port`.
 * `in1`/`in2` sont le texte brut des deux opérandes : un mnémonique de variable existante ou un
 * littéral (voir `BLOCK_OPERAND_LITERALS`). `operator` est la comparaison à appliquer.
 * L'analyseur vérifie que `in1` et `in2` ont le même type (voir `CompareBlockAnalyser`) ; `Q`
 * vaut `IN ET (in1 <operator> in2)`. Édité uniquement sur le canevas (voir `CompareBlockNode`),
 * pas de fenêtre dédiée ; opérandes vides autorisés à la création.
 */
export type CompareBlockParams = {
	in1: string;
	in2: string;
	operator: CompareOperator;
};

/** Genres de littéral acceptés sur une pinoche d'opérande de bloc (IN1/IN2 d'un compare,
 * `in` d'un assign, IN1/IN2 d'un arithmetic) — tout sauf une constante TIME (qui n'a de sens que
 * pour une pinoche timer et n'est pas une expression valide isolée). */
export const BLOCK_OPERAND_LITERALS = [
	"number",
	"boolean",
	"string",
] as const;

/**
 * Bloc `"assign"` : `out := in`, exécuté seulement quand `EN` est vrai ; `ENO` toujours vrai
 * (l'affectation n'est jamais elle-même une condition pour le rail — voir `AssignBlockAnalyser`/
 * `LadderPreCompiler`). `in` est un opérande simple (mnémonique de variable ou littéral, voir
 * `BLOCK_OPERAND_LITERALS`), jamais une expression. `out` est le mnémonique d'une variable
 * existante inscriptible (pas une entrée). Édité uniquement sur le canevas (voir `BlockNode`).
 */
export type AssignBlockParams = { out: string; in: string };

/** Les 4 opérateurs d'un bloc `"arithmetic"` — exactement ceux du langage d'expression. */
export const ARITHMETIC_BLOCK_OPERATORS = ARITHMETIC_OPERATORS;

/**
 * Bloc `"arithmetic"` : `out := in1 <operator> in2`, exécuté seulement quand `EN` est vrai ;
 * `ENO` toujours vrai (même moule qu'`assign`). `in1`/`in2` sont des opérandes simples (variable
 * ou littéral numérique), `out` le mnémonique d'une variable numérique existante inscriptible.
 * Édité uniquement sur le canevas.
 */
export type ArithmeticBlockParams = {
	in1: string;
	in2: string;
	out: string;
	operator: ArithmeticOperator;
};

const EN_ENO_PORT_SPECS: BlockPortSpec[] = [
	{
		suffix: "EN",
		type: "BOOL",
		kind: "structural",
		direction: "input",
		generatesVariable: true,
	},
	{
		suffix: "ENO",
		type: "BOOL",
		kind: "structural",
		direction: "output",
		generatesVariable: true,
	},
];

/** EN/ENO structurels + rangée pinoche IN (gauche) / OUT (droite). */
export const ASSIGN_PORT_SPECS: BlockPortSpec[] = [
	...EN_ENO_PORT_SPECS,
	{
		suffix: "IN",
		type: "ANY",
		kind: "parameter",
		direction: "input",
		generatesVariable: false,
		acceptedLiterals: [...BLOCK_OPERAND_LITERALS],
	},
	{
		suffix: "OUT",
		type: "ANY",
		kind: "parameter",
		direction: "output",
		generatesVariable: false,
		excludeInputVariable: true,
	},
];

/** EN/ENO structurels + rangées IN1/OUT puis IN2 — opérandes numériques uniquement. */
export const ARITHMETIC_PORT_SPECS: BlockPortSpec[] = [
	...EN_ENO_PORT_SPECS,
	{
		suffix: "IN1",
		type: "INT",
		kind: "parameter",
		direction: "input",
		generatesVariable: false,
		acceptedLiterals: ["number"],
	},
	{
		suffix: "IN2",
		type: "INT",
		kind: "parameter",
		direction: "input",
		generatesVariable: false,
		acceptedLiterals: ["number"],
	},
	{
		suffix: "OUT",
		type: "INT",
		kind: "parameter",
		direction: "output",
		generatesVariable: false,
		excludeInputVariable: true,
	},
];

export type BlockData =
	| { blockType: "user-program"; params: UserProgramBlockParams }
	| { blockType: "timer"; params: TimerBlockParams }
	| { blockType: "counter"; params: CounterBlockParams }
	| { blockType: "compare"; params: CompareBlockParams }
	| { blockType: "assign"; params: AssignBlockParams }
	| { blockType: "arithmetic"; params: ArithmeticBlockParams };

export type BlockElement = SharedElement<"block", BlockData, GridPosition>;

export function createUserProgramBlockElement(
	programId: string,
	row: number,
	col: number,
): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "user-program", params: { programId } },
		position: { row, col },
	};
}

/** À la dépose sur le canevas, `params` est omis : pinoches vides et opérateur `=`, le bloc est
 * configuré ensuite sur place (jamais via une fenêtre préalable). Les templates passent des
 * `params` explicites. */
export function createCompareBlockElement(
	row: number,
	col: number,
	params: CompareBlockParams = { in1: "", in2: "", operator: "=" },
): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "compare", params },
		position: { row, col },
	};
}

/** Accesseur pratique — même rôle que `getTimerBlockParams`/`getCounterBlockParams`. */
export function getCompareBlockParams(
	element: BlockElement,
): CompareBlockParams | null {
	return element.data.blockType === "compare" ? element.data.params : null;
}

/** `params` omis à la dépose (pinoches vides), explicite pour les templates. */
export function createAssignBlockElement(
	row: number,
	col: number,
	params: AssignBlockParams = { out: "", in: "" },
): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "assign", params },
		position: { row, col },
	};
}

/** Accesseur pratique — même rôle que `getCompareBlockParams`. */
export function getAssignBlockParams(
	element: BlockElement,
): AssignBlockParams | null {
	return element.data.blockType === "assign" ? element.data.params : null;
}

/** `params` omis à la dépose (pinoches vides, opérateur `+`), explicite pour les templates. */
export function createArithmeticBlockElement(
	row: number,
	col: number,
	params: ArithmeticBlockParams = { in1: "", in2: "", out: "", operator: "+" },
): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "arithmetic", params },
		position: { row, col },
	};
}

/** Accesseur pratique — même rôle que `getAssignBlockParams`. */
export function getArithmeticBlockParams(
	element: BlockElement,
): ArithmeticBlockParams | null {
	return element.data.blockType === "arithmetic" ? element.data.params : null;
}
