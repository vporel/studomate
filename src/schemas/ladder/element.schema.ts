import { createRandomId } from "@/ids";
import SharedElement from "../shared/element.schema";
import { BlockElement } from "./block.schema";

export const LADDER_ELEMENT_KINDS = ["contact", "coil", "railTerminal", "block"] as const;

export type LadderElementKind = (typeof LADDER_ELEMENT_KINDS)[number];

export const CONTACT_MODES = ["NO", "NF", "P", "N"] as const;

export type ContactMode = (typeof CONTACT_MODES)[number];

export const COIL_MODES = ["normal", "set", "reset"] as const;

export type CoilMode = (typeof COIL_MODES)[number];

/** Position sur la grille d'une section — pas de pixels, contrairement au GRAFCET. */
export type GridPosition = { row: number; col: number };

export type ContactData = { variable: string; mode: ContactMode };
export type CoilData = { variable: string; mode: CoilMode };
export type RailTerminalData = Record<string, never>;

export type ContactElement = SharedElement<"contact", ContactData, GridPosition>;
export type CoilElement = SharedElement<"coil", CoilData, GridPosition>;

/** Lane fixe du rail d'alimentation — un `railTerminal` n'est jamais déplacé horizontalement. */
export const RAIL_TERMINAL_COL = -1;

/**
 * Borne d'alimentation explicite : représente la connexion au rail d'une ligne. N'est persisté
 * dans `Section.elements` que s'il relie effectivement au moins un élément (voir
 * `Ladder.pruneOrphanedRailTerminals`) — jamais posé "par défaut" sur toutes les lignes.
 */
export type RailTerminalElement = SharedElement<"railTerminal", RailTerminalData, GridPosition>;

/**
 * Un élément posé sur la grille d'une section (contact, bobine ou borne d'alimentation). La
 * topologie électrique (série/parallèle) n'est pas portée par l'élément mais par les
 * `Connection` qui le relient à d'autres éléments : une divergence (plusieurs connexions
 * sortantes) est toujours un OU, une convergence (plusieurs connexions entrantes) aussi, un
 * enchaînement simple est l'ET implicite.
 */
export type LadderElement = ContactElement | CoilElement | RailTerminalElement | BlockElement;

/** Largeur en colonnes de grille occupées par un élément — 1 pour tous sauf `block`, qui en
 * occupe 2 (entrée/sortie visuellement distinctes, voir `BlockNode`). */
export const LADDER_ELEMENT_WIDTHS: Record<LadderElementKind, number> = {
	contact: 1,
	coil: 1,
	railTerminal: 1,
	block: 2,
};

export function getElementWidth(element: LadderElement): number {
	return LADDER_ELEMENT_WIDTHS[element.type];
}

export function createContactElement(variable: string, mode: ContactMode, row: number, col: number): ContactElement {
	return { id: createRandomId(), type: "contact", data: { variable, mode }, position: { row, col } };
}

export function createCoilElement(variable: string, mode: CoilMode, row: number, col: number): CoilElement {
	return { id: createRandomId(), type: "coil", data: { variable, mode }, position: { row, col } };
}

export function createRailTerminalElement(row: number): RailTerminalElement {
	return { id: createRandomId(), type: "railTerminal", data: {}, position: { row, col: RAIL_TERMINAL_COL } };
}
