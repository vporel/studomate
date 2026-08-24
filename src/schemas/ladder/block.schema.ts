import { createRandomId } from "@/ids";
import type { TimerType } from "../function-blocks/timer.schema";
import SharedElement from "../shared/element.schema";
import type { GridPosition } from "./element.schema";

/**
 * Les types de bloc existants — un par bloc **concret**, jamais une famille générique... sauf
 * `"timer"` : TON/TOF/TP partagent tous ports et mécanisme (voir `BLOCK_PORT_LABELS`), seul leur
 * logigramme interne diffère, ce qui vit comme paramètre `timerType` sur `TimerBlockParams`
 * plutôt que comme trois entrées distinctes ici.
 */
export const BLOCK_TYPES = ["user-program", "timer"] as const;

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

export type BlockData =
	| { blockType: "user-program"; params: UserProgramBlockParams }
	| { blockType: "timer"; params: TimerBlockParams };

export type BlockElement = SharedElement<"block", BlockData, GridPosition>;

export function createUserProgramBlockElement(programId: string, row: number, col: number): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "user-program", params: { programId } },
		position: { row, col },
	};
}
