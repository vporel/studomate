"use client";

import { useProjectContext } from "@/components/projects/ProjectContext";
import { useReactFlow } from "@xyflow/react";
import React, { useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import useCommandsHandlers from "./useCommandsHandlers";

export default function useShortcutsHandler(grafcetId: string): (e: React.KeyboardEvent) => void {
	const { setNodes, setEdges } = useReactFlow();
	const { undoLastCommand, redoLastCommand } = useGrafcetContext();
	const { commandUndo, commandRedo } = useCommandsHandlers();
	const { activeScope } = useProjectContext();

	return useCallback(
		(e: React.KeyboardEvent) => {
			if (activeScope !== grafcetId) return;
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
						const commands = undoLastCommand();
						for (const command of commands ?? []) {
							commandUndo(command);
						}
						break;
					}
					case "y": {
						e.preventDefault();
						const commands = redoLastCommand();
						for (const command of commands ?? []) {
							commandRedo(command);
						}
						break;
					}
				}
			}
		},
		[activeScope, grafcetId, setNodes, undoLastCommand, commandUndo, redoLastCommand, commandRedo]
	);
}
