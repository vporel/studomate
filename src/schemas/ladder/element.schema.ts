import { createRandomId } from "@/ids";
import SharedElement from "../shared/element.schema";
import {
	getBlockElementHeight,
	getBlockElementWidth,
} from "./block-definition";
import { BlockData, BlockElement } from "./block.schema";

export const LADDER_ELEMENT_KINDS = [
	"contact",
	"coil",
	"railTerminal",
	"block",
] as const;

export type LadderElementKind = (typeof LADDER_ELEMENT_KINDS)[number];

export const CONTACT_TYPES = ["NO", "NF", "P", "N"] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];

export const COIL_TYPES = ["normal", "set", "reset"] as const;

export type CoilType = (typeof COIL_TYPES)[number];

/** Position sur la grille d'une section — pas de pixels, contrairement au GRAFCET. */
export type GridPosition = { row: number; col: number };

export type ContactData = { variable: string; type: ContactType };
export type CoilData = { variable: string; type: CoilType };
export type RailTerminalData = Record<string, never>;

/** Modifications partielles applicables à `element.data` via `Ladder.updateElement` /
 * `ElementUpdateCommand`. Pour un bloc, `params` est l'union de toutes les formes de params —
 * l'appelant fournit une forme concrète, le merge est un simple `Object.assign` au runtime. */
export type LadderElementDataChanges =
	| Partial<ContactData>
	| Partial<CoilData>
	| { blockType?: BlockData["blockType"]; params?: BlockData["params"] };

export type ContactElement = SharedElement<
	"contact",
	ContactData,
	GridPosition
>;
export type CoilElement = SharedElement<"coil", CoilData, GridPosition>;

/** Lane fixe du rail d'alimentation — un `railTerminal` n'est jamais déplacé horizontalement. */
export const RAIL_TERMINAL_COL = -1;

/**
 * Borne d'alimentation explicite : représente la connexion au rail d'une ligne. N'est persisté
 * dans `Section.elements` que s'il relie effectivement au moins un élément (voir
 * `Ladder.pruneOrphanedRailTerminals`) — jamais posé "par défaut" sur toutes les lignes.
 */
export type RailTerminalElement = SharedElement<
	"railTerminal",
	RailTerminalData,
	GridPosition
>;

/**
 * Un élément posé sur la grille d'une section (contact, bobine ou borne d'alimentation). La
 * topologie électrique (série/parallèle) n'est pas portée par l'élément mais par les
 * `Connection` qui le relient à d'autres éléments : une divergence (plusieurs connexions
 * sortantes) est toujours un OU, une convergence (plusieurs connexions entrantes) aussi, un
 * enchaînement simple est l'ET implicite.
 */
export type LadderElement =
	ContactElement | CoilElement | RailTerminalElement | BlockElement;

/** Largeur en colonnes de grille occupées par un élément non-bloc — toujours 1. La largeur d'un
 * bloc dépend de sa famille (voir `BLOCK_DEFINITIONS`), résolue par `getElementWidth`. */
export const LADDER_ELEMENT_WIDTHS: Record<
	Exclude<LadderElementKind, "block">,
	number
> = {
	contact: 1,
	coil: 1,
	railTerminal: 1,
};

export function getElementWidth(element: LadderElement): number {
	if (element.type === "block") return getBlockElementWidth(element.data);
	return LADDER_ELEMENT_WIDTHS[element.type];
}

/**
 * Hauteur en cellules de grille (entière — la grille ne réserve qu'en cellules pleines) — 1 pour
 * tout élément non-bloc. Pour un bloc, dérivée des specs de ports de sa famille (voir
 * `getBlockElementHeight` / `getBlockHeightInCells`) : un bloc timer en occupe 2 (IN/Q puis
 * PT/ET), un bloc compare 1 (comme un contact).
 */
export function getElementHeight(element: LadderElement): number {
	if (element.type !== "block") return 1;
	return getBlockElementHeight(element.data);
}

export function createContactElement(
	variable: string,
	type: ContactType,
	row: number,
	col: number,
): ContactElement {
	return {
		id: createRandomId(),
		type: "contact",
		data: { variable, type },
		position: { row, col },
	};
}

export function createCoilElement(
	variable: string,
	type: CoilType,
	row: number,
	col: number,
): CoilElement {
	return {
		id: createRandomId(),
		type: "coil",
		data: { variable, type },
		position: { row, col },
	};
}

export function createRailTerminalElement(row: number): RailTerminalElement {
	return {
		id: createRandomId(),
		type: "railTerminal",
		data: {},
		position: { row, col: RAIL_TERMINAL_COL },
	};
}
