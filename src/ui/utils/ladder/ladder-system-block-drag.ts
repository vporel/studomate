import { AssignBlockParams, CompareBlockParams, CounterBlockParams, TimerBlockParams } from "@/schemas/ladder/block.schema";

/**
 * Type MIME du glisser-déposer d'un bloc système (tempo, compteur, compare, affectation) depuis
 * la section "Blocs systèmes" de l'explorateur (ou l'outil dédié de la toolbar, voir
 * `LadderSystemBlockTool`) vers le canevas d'un ladder — même mécanisme que
 * `LADDER_PROGRAM_DRAG_MIME_TYPE` (`DataTransfer` natif, explorateur et éditeur ladder ne
 * partageant aucun contexte React commun). La valeur transportée est le `blockType`
 * (`"timer"`/`"counter"`/`"compare"`/`"assign"`).
 */
export const LADDER_SYSTEM_BLOCK_DRAG_MIME_TYPE = "application/x-studomate-ladder-system-block-type";

/**
 * État d'une création de bloc système en attente de validation (voir `LadderStoreState.
 * pendingSystemBlockCreation`) — une entrée par famille de bloc, discriminée par `blockType`.
 */
export type PendingSystemBlockCreation =
	| { blockType: "timer"; insert: (params: TimerBlockParams) => void }
	| { blockType: "counter"; insert: (params: CounterBlockParams) => void }
	| { blockType: "compare"; insert: (params: CompareBlockParams) => void }
	| { blockType: "assign"; insert: (params: AssignBlockParams) => void };

/**
 * État d'une édition de bloc système en attente de validation (voir `LadderStoreState.
 * pendingSystemBlockEdit`), ouverte par double-clic sur un bloc existant dans le canevas —
 * `initial` porte les valeurs actuelles pour préremplir la fenêtre, `elementId` cible l'élément
 * à modifier via `ElementUpdateCommand`.
 */
export type PendingSystemBlockEdit =
	| { blockType: "timer"; elementId: string; initial: TimerBlockParams }
	| { blockType: "counter"; elementId: string; initial: CounterBlockParams }
	| { blockType: "compare"; elementId: string; initial: CompareBlockParams }
	| { blockType: "assign"; elementId: string; initial: AssignBlockParams };
