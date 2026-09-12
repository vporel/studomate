import { LadderNodeType } from "@/ui/components/ladder/flow/ladder-nodes-definitions";
import { Edge } from "@xyflow/react";
import {
	LadderStoreGetFunction,
	LadderStoreSetFunction,
} from "../ladder.store";

type SelectionMaps = {
	nodesBySectionId: Record<string, LadderNodeType[]>;
	edgesBySectionId: Record<string, Edge[]>;
};

const deselectList = <T extends { selected?: boolean }>(items: T[]): T[] =>
	items.some((item) => item.selected)
		? items.map((item) =>
				item.selected ? { ...item, selected: false } : item,
			)
		: items;

/**
 * La sélection du Ladder est globale : chaque section a sa propre instance React Flow, qui
 * n'efface que sa propre sélection. Sans cette coordination, cliquer un nœud d'une section
 * laisse sélectionné celui d'une autre — copier/coller ramasse alors des éléments de plusieurs
 * sections (empilés sur une même cellule au collage) et supprimer en emporte un resté
 * sélectionné ailleurs. Renvoie les maps nœuds/arêtes avec la sélection retirée partout sauf
 * dans `keepSectionId` ; les maps inchangées sont renvoyées par référence (aucun re-render).
 */
export function withSelectionClearedOutside(
	s: SelectionMaps,
	keepSectionId: string,
	active: boolean,
): SelectionMaps {
	if (!active) {
		return {
			nodesBySectionId: s.nodesBySectionId,
			edgesBySectionId: s.edgesBySectionId,
		};
	}
	const nodesBySectionId: Record<string, LadderNodeType[]> = {};
	for (const [id, nodes] of Object.entries(s.nodesBySectionId)) {
		nodesBySectionId[id] = id === keepSectionId ? nodes : deselectList(nodes);
	}
	const edgesBySectionId: Record<string, Edge[]> = {};
	for (const [id, edges] of Object.entries(s.edgesBySectionId)) {
		edgesBySectionId[id] = id === keepSectionId ? edges : deselectList(edges);
	}
	return { nodesBySectionId, edgesBySectionId };
}

/** Sélection des nœuds/arêtes du canevas Ladder — lecture pour le menu contextuel du pane,
 * « tout sélectionner », désélection globale. */
export default class LadderSelectionManager {
	private setStoreState: LadderStoreSetFunction;
	private getStoreState: LadderStoreGetFunction;

	constructor(
		setStoreState: LadderStoreSetFunction,
		getStoreState: LadderStoreGetFunction,
	) {
		this.setStoreState = setStoreState;
		this.getStoreState = getStoreState;
	}

	getNodes(sectionId: string): LadderNodeType[] {
		return this.getStoreState().nodesBySectionId[sectionId] ?? [];
	}

	getEdges(sectionId: string): Edge[] {
		return this.getStoreState().edgesBySectionId[sectionId] ?? [];
	}

	selectAllNodesAndEdges(sectionId: string): void {
		this.setStoreState((state) => ({
			nodesBySectionId: {
				...(state.nodesBySectionId || {}),
				[sectionId]: (state.nodesBySectionId[sectionId] ?? []).map((n) => ({
					...n,
					selected: true,
				})),
			},
			edgesBySectionId: {
				...(state.edgesBySectionId || {}),
				[sectionId]: (state.edgesBySectionId[sectionId] ?? []).map((e) => ({
					...e,
					selected: true,
				})),
			},
		}));
	}

	/** Retire la sélection de tous les nœuds et liaisons, dans toutes les sections. */
	deselectAllElements(): void {
		const deselect = <T extends { selected?: boolean }>(
			itemsBySectionId: Record<string, T[]>,
		): Record<string, T[]> =>
			Object.fromEntries(
				Object.entries(itemsBySectionId).map(([id, items]) => [
					id,
					deselectList(items),
				]),
			);

		this.setStoreState((state) => ({
			nodesBySectionId: deselect(state.nodesBySectionId),
			edgesBySectionId: deselect(state.edgesBySectionId),
		}));
	}

	selectAllEdges(sectionId: string): void {
		this.setStoreState((state) => ({
			edgesBySectionId: {
				...(state.edgesBySectionId || {}),
				[sectionId]: (state.edgesBySectionId[sectionId] ?? []).map((e) => ({
					...e,
					selected: true,
				})),
			},
		}));
	}

	/**
	 * Sélectionne tout dans la dernière section sur laquelle l'utilisateur a interagi
	 * (`activeSectionId`, alimentée au clic dans une section) : à la différence du GRAFCET, un
	 * Ladder a plusieurs sections indépendantes, donc « tout sélectionner » n'a de sens que
	 * relativement à l'une d'elles.
	 */
	selectAllInActiveSection(): void {
		const sectionId = this.getStoreState().activeSectionId;
		if (!sectionId) return;
		this.selectAllNodesAndEdges(sectionId);
	}
}
