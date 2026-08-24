import { createRandomId } from "@/ids";
import SharedElement from "../shared/element.schema";
import type { GridPosition } from "./element.schema";

/**
 * Les types de bloc existants — un par bloc **concret**, jamais une famille générique : quand un
 * bloc système (tempo, comptage, opérations...) sera implémenté, il obtient sa propre entrée ici
 * (avec ses propres ports, voir `BLOCK_PORT_LABELS`), comme `PROGRAM_TYPES`/`LADDER_ELEMENT_KINDS`
 * ne listent que ce qui existe déjà.
 */
export const BLOCK_TYPES = ["user-program"] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export type BlockPortLabels = { input: string; output: string };

/**
 * Tout bloc a exactement deux ports d'alimentation structurels — une entrée et une sortie,
 * câblées sur le rail comme un contact (voir la conversation d'origine). Leurs noms par défaut
 * sont `EN`/`ENO`, personnalisables par type de bloc (ex. `IN`/`Q` pour une future tempo).
 * Tout autre port propre à un type de bloc (ex. `PT`/`ET` d'une tempo) sera une "block variable"
 * — pas câblée sur le rail, prédéfinie par le type de bloc, non concernée par ce mécanisme.
 */
export const BLOCK_PORT_LABELS: Record<BlockType, BlockPortLabels> = {
	"user-program": { input: "EN", output: "ENO" },
};

export type UserProgramBlockParams = { programId: string };

export type BlockData = { blockType: "user-program"; params: UserProgramBlockParams };

export type BlockElement = SharedElement<"block", BlockData, GridPosition>;

export function createUserProgramBlockElement(programId: string, row: number, col: number): BlockElement {
	return {
		id: createRandomId(),
		type: "block",
		data: { blockType: "user-program", params: { programId } },
		position: { row, col },
	};
}
