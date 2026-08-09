"use client";

import AbstractLadderCommand from "@/schemas/ladder/commands/abstract-ladder.command";
import ConnectionsAddCommand from "@/schemas/ladder/commands/connections-add.command";
import ElementsAddCommand from "@/schemas/ladder/commands/elements-add.command";
import Connection from "@/schemas/ladder/connection.schema";
import { createRailTerminalElement } from "@/schemas/ladder/element.schema";
import Section from "@/schemas/ladder/section.schema";
import { createRandomId } from "@/ids";
import { initialConnectionPoints } from "@/ui/utils/ladder/ladder-connection-path";
import { parseVirtualRailRow } from "@/ui/utils/ladder/ladder-flow-builder";
import { Connection as XYFlowConnection } from "@xyflow/react";
import { useCallback } from "react";
import { useLadderStore } from "../context/LadderContext";

/**
 * Dispatche l'ajout d'une connexion tracée manuellement (`onConnect` de `<ReactFlow>`) —
 * `isValidConnection` a déjà filtré les tracés invalides avant que ce callback ne soit appelé,
 * mais `ConnectionsAddCommand.execute` revalide en autorité.
 *
 * Si la source est une borne d'alimentation virtuelle (ligne sans borne réelle, voir
 * `buildSectionFlow`), la matérialise d'abord — même logique que `useLadderDropHandlers` pour un
 * dépôt en colonne 0, réutilisée ici pour qu'un tracé manuel puisse aussi relier un élément déjà
 * posé (orphelin) au rail.
 */
export default function useLadderConnectHandler(section: Section): (connection: XYFlowConnection) => void {
	const commandsStackManager = useLadderStore((state) => state.commandsStackManager);

	return useCallback(
		(connection: XYFlowConnection) => {
			const virtualRow = parseVirtualRailRow(connection.source);
			const railTerminal = virtualRow !== null ? createRailTerminalElement(virtualRow) : null;
			const sourceId = railTerminal ? railTerminal.id : connection.source;
			const sourcePosition = railTerminal ? railTerminal.position : section.getElement(sourceId)?.position;
			const targetPosition = section.getElement(connection.target)?.position;

			const sourceElement = railTerminal || section.getElement(sourceId);
			const targetElement = section.getElement(connection.target);
			const commands: AbstractLadderCommand<any>[] = [];
			if (railTerminal) {
				commands.push(new ElementsAddCommand({ sectionId: section.id, elements: [railTerminal] }));
			}
			commands.push(
				new ConnectionsAddCommand({
					sectionId: section.id,
					connections: [
						new Connection(createRandomId(), { id: sourceId, type: sourceElement?.type as any || "contact", handle: connection.sourceHandle || "source" }, { id: connection.target, type: targetElement?.type as any || "coil", handle: connection.targetHandle || "target" }, {
							// Matérialisé une seule fois, ici — jamais recalculé ensuite (voir
							// `initialConnectionPoints`).
							points:
								sourcePosition && targetPosition
									? initialConnectionPoints(sourcePosition, targetPosition)
									: [],
						}),
					],
				}),
			);
			commandsStackManager.executeOperation(commands);
		},
		[section, commandsStackManager],
	);
}
