import { createRandomId } from "@/ids";
import type { CounterType } from "../function-blocks/counter.schema";
import type { TimerType } from "../function-blocks/timer.schema";
import SharedElement from "../shared/element.schema";
import type { GridPosition } from "./element.schema";

/**
 * Les types de bloc existants — un par bloc **concret**, jamais une famille générique... sauf
 * `"timer"`/`"counter"` : leurs variantes (TON/TOF/TP, CTU/CTD) partagent le même mécanisme, ce
 * qui vit comme paramètre (`timerType`/`counterType`) sur leurs params plutôt que comme des
 * entrées distinctes ici. Contrairement au timer, les ports structurels d'un compteur dépendent
 * de sa variante (voir `getCounterPortSpecs`) — `BLOCK_PORT_LABELS["counter"]` n'en porte donc
 * qu'un défaut (CTU), à ignorer au profit de `getCounterPortSpecs` partout où la variante réelle
 * est connue (voir `BlockNode`). `"compare"` n'est pas non plus une famille "function block" façon
 * timer/counter : il n'a pas de nom, pas de pinoche paramètre référençant une variable — juste ses
 * deux ports structurels (génériques, comme `"user-program"`) et une expression opaque validée par
 * `CompareBlockAnalyser`, jamais une `BlockPortSpec`. `"assign"` suit le même principe (voir
 * `AssignBlockParams`), ports `EN`/`ENO` comme `"user-program"`.
 */
export const BLOCK_TYPES = ["user-program", "timer", "counter", "compare", "assign"] as const;

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
export type TimerBlockParams = { name: string; timerType: TimerType; pt: string; et?: string };

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

/**
 * Un bloc `"compare"` n'a pas de nom : IN/Q passent par le mécanisme générique de variables
 * mémoire cachées (voir `LadderAnalyser.buildBlockPortVariables`, jamais exclu pour ce blockType
 * — comme `"user-program"`), pas par des variables exposées `<Nom>.Port`. `expression` est le
 * texte brut de l'unique pinoche du bloc : une expression (opérateurs arithmétiques/de
 * comparaison uniquement, jamais d'affectation ni de bloc timer/compteur) devant retourner un
 * booléen — voir `CompareBlockAnalyser`. Éditée uniquement via `CompareBlockDialog` (pas de
 * pinoche sur le canevas, contrairement à PT/ET ou PV/CV), vide autorisé à la création.
 */
export type CompareBlockParams = { expression: string };

/**
 * Même principe que `CompareBlockParams`, pas de nom non plus : ports génériques `EN`/`ENO`
 * (comme `"user-program"`), ENO toujours vrai (l'affectation n'est jamais elle-même une condition
 * pour le rail — voir `AssignBlockAnalyser`/`LadderPreCompiler`). `expression` doit contenir une
 * et une seule affectation (ex. `"A := B + 1"`), de n'importe quel type final — contrairement à
 * `CompareBlockParams`, aucune contrainte booléenne ni de restriction aux seuls opérateurs
 * arithmétiques/de comparaison.
 */
export type AssignBlockParams = { expression: string };

export type BlockData =
	| { blockType: "user-program"; params: UserProgramBlockParams }
	| { blockType: "timer"; params: TimerBlockParams }
	| { blockType: "counter"; params: CounterBlockParams }
	| { blockType: "compare"; params: CompareBlockParams }
	| { blockType: "assign"; params: AssignBlockParams };

export type BlockElement = SharedElement<"block", BlockData, GridPosition>;

export function createUserProgramBlockElement(programId: string, row: number, col: number): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "user-program", params: { programId } },
		position: { row, col },
	};
}

export function createCompareBlockElement(params: CompareBlockParams, row: number, col: number): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "compare", params },
		position: { row, col },
	};
}

/** Accesseur pratique — même rôle que `getTimerBlockParams`/`getCounterBlockParams`. */
export function getCompareBlockParams(element: BlockElement): CompareBlockParams | null {
	return element.data.blockType === "compare" ? element.data.params : null;
}

export function createAssignBlockElement(params: AssignBlockParams, row: number, col: number): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "assign", params },
		position: { row, col },
	};
}

/** Accesseur pratique — même rôle que `getCompareBlockParams`. */
export function getAssignBlockParams(element: BlockElement): AssignBlockParams | null {
	return element.data.blockType === "assign" ? element.data.params : null;
}
