"use client";

import ConnectionUpdateCommand from "@/schemas/ladder/commands/connection-update.command";
import { Edge } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { LadderConnectionEdgeType } from "../edges/LadderConnectionEdge";

/**
 * Déplacement au clavier (flèches gauche/droite) du segment vertical d'une connexion
 * sélectionnée — pendant du glisser à la souris de `LadderConnectionEdge`, même commit via
 * `ConnectionUpdateCommand`. Une seule connexion sélectionnée à la fois : ambigu sinon (quel
 * segment déplacer). Aucun effet sur une connexion même-ligne (`points` vide, aucun segment
 * vertical à déplacer).
 */
export default function useLadderConnectionKeyboardHandler(edges: Edge[]) {
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);

	return useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			const selectedEdges = edges.filter((edge) => edge.selected && edge.type === LADDER_CONNECTION_EDGE_TYPE);
			if (selectedEdges.length !== 1) return;
			const edge = selectedEdges[0] as LadderConnectionEdgeType;
			const points = edge.data?.points ?? [];
			if (points.length === 0) return;

			e.preventDefault();
			e.stopPropagation();

			// Un pas = un quart de cellule (voir `CELL_SUBDIVISIONS`), même granularité que le snap du
			// glisser.
			const delta = e.key === "ArrowLeft" ? -1 : 1;
			const newPoints: [number, number][] = points.map(([row, col]) => [row, col + delta]);

			commandsStackManager.executeOperation([
				new ConnectionUpdateCommand({
					connectionId: edge.id,
					changes: { points: newPoints },
					previousChanges: { points: points.map(([row, col]) => [row, col]) },
				}),
			]);
		},
		[edges, commandsStackManager],
	);
}
