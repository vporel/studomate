"use client";

import Section from "@/schemas/ladder/section.schema";
import { Node, OnDelete } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";

/**
 * Dispatche la suppression des nœuds/arêtes sélectionnés (touche Suppr ou menu contextuel). Les
 * bornes d'alimentation virtuelles (non persistées) sont filtrées : `section.getElement` échoue
 * dessus — la cascade elle-même vit dans `LadderWorkflowManager.deleteElements`, partagée avec le
 * couper (Ctrl+X).
 */
export default function useLadderDeleteHandler(section: Section): OnDelete {
	const workflowManager = useLadderStore((state) => state.workflowManager);

	return useCallback(
		({ nodes, edges }: { nodes: Node[]; edges: { id: string }[] }) => {
			workflowManager.deleteElements(
				section.id,
				nodes.map((node) => node.id),
				edges.map((edge) => edge.id),
			);
		},
		[section, workflowManager],
	);
}
