"use client";

import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionsRemoveCommand from "@/schemas/ladder/commands/connections-remove.command";
import ElementsRemoveCommand from "@/schemas/ladder/commands/elements-remove.command";
import Section from "@/schemas/ladder/section.schema";
import { Node, OnDelete } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";

/**
 * Dispatche la suppression des nœuds/arêtes sélectionnés (touche Suppr ou menu contextuel) via
 * les commandes déjà existantes — jusqu'ici sans appelant côté UI. Les bornes d'alimentation
 * virtuelles (non persistées) sont filtrées : `section.getElement` échoue dessus.
 */
export default function useLadderDeleteHandler(section: Section): OnDelete {
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);

	return useCallback(
		({ nodes, edges }: { nodes: Node[]; edges: { id: string }[] }) => {
			const removedElementIds = new Set(nodes.map((node) => node.id).filter((id) => section.getElement(id)));
			const commands: AbstractLadderCommand<any>[] = [];

			if (removedElementIds.size > 0) {
				const elements = [...removedElementIds].map((id) => ({
					sectionId: section.id,
					element: section.getElement(id)!,
				}));
				const touchedConnections = section.connections
					.filter((c) => removedElementIds.has(c.source.id) || removedElementIds.has(c.target.id))
					.map((connection) => ({ sectionId: section.id, connection }));
				commands.push(new ElementsRemoveCommand({ elements, connections: touchedConnections }));
			}

			// Arêtes supprimées isolément (aucune de leurs extrémités n'est déjà couverte par la
			// cascade d'ElementsRemoveCommand ci-dessus).
			const standaloneConnections = edges
				.map((edge) => section.connections.find((c) => c.id === edge.id))
				.filter((c): c is NonNullable<typeof c> => !!c)
				.filter((c) => !removedElementIds.has(c.source.id) && !removedElementIds.has(c.target.id));
			if (standaloneConnections.length > 0) {
				commands.push(new ConnectionsRemoveCommand({ sectionId: section.id, connections: standaloneConnections }));
			}

			if (commands.length > 0) commandsStackManager.executeOperation(commands);
		},
		[section, commandsStackManager],
	);
}
