"use client";

import ElementsAddCommand from "@/schemas/grafcet/commands/ElementsAddCommand.class";
import ElementsRemoveCommand from "@/schemas/grafcet/commands/ElementsRemoveCommand.class";
import ElementsUpdateCommand from "@/schemas/grafcet/commands/ElementsUpdateCommand.class";
import { useReactFlow } from "@xyflow/react";
import React, { useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";

export default function useShortcutsHandler(): (e: React.KeyboardEvent) => void {
	const { setNodes } = useReactFlow();
	const { undoLastCommand, redoLastCommand } = useGrafcetContext();

	return useCallback(
		(e: React.KeyboardEvent) => {
			//Ctrl+A : Select all
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "a": {
						e.preventDefault();
						setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
						break;
					}
					case "z": {
						e.preventDefault();
						const command = undoLastCommand();
						if (command instanceof ElementsAddCommand) {
							setNodes((nds) =>
								nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1)
							);
						} else if (command instanceof ElementsRemoveCommand) {
							setNodes((nds) => [...nds, ...command.payload]);
						} else if (command instanceof ElementsUpdateCommand) {
							setNodes((nds) =>
								nds.map((n) => {
									const node = command.payload.findIndex((e) => e.id === n.id);
									if (node === -1) return n;
									return {
										...n,
										data: { ...n.data, ...command.payload[node].previousData },
										position: command.payload[node].previousPosition,
									};
								})
							);
						}
						break;
					}
					case "y": {
						e.preventDefault();
						const command = redoLastCommand();
						if (command instanceof ElementsAddCommand) {
							setNodes((nds) => [...nds, ...command.payload]);
						} else if (command instanceof ElementsRemoveCommand) {
							setNodes((nds) =>
								nds.filter((n) => command.payload.findIndex((e) => e.id === n.id) === -1)
							);
						} else if (command instanceof ElementsUpdateCommand) {
							setNodes((nds) =>
								nds.map((n) => {
									const node = command.payload.findIndex((e) => e.id === n.id);
									if (node === -1) return n;
									return {
										...n,
										data: { ...n.data, ...command.payload[node].data },
										position: command.payload[node].position,
									};
								})
							);
						}
						break;
					}
				}
			}
		},
		[setNodes, undoLastCommand, redoLastCommand]
	);
}
