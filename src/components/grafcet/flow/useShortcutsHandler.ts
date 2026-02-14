"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import React, { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";

export default function useShortcutsHandler(): (e: React.KeyboardEvent) => void {
	const { grafcetId, undoOperation, redoOperation, selectAllNodesAndEdges } = useGrafcetStore(
		useShallow((state) => ({
			grafcetId: state.grafcet.id,
			undoOperation: state.undoOperation,
			redoOperation: state.redoOperation,
			selectAllNodesAndEdges: state.selectAllNodesAndEdges,
		})),
	);

	const activeScope = useProjectStore((state) => state.activeScope);

	return useCallback(
		(e: React.KeyboardEvent) => {
			if (activeScope !== grafcetId) return;
			if (e.ctrlKey || e.metaKey) {
				switch (e.key.toLowerCase()) {
					case "a": {
						e.preventDefault();
						selectAllNodesAndEdges();
						break;
					}
					case "z": {
						e.preventDefault();
						undoOperation();
						break;
					}
					case "y": {
						e.preventDefault();
						redoOperation();
						break;
					}
				}
			}
		},
		[activeScope, grafcetId, selectAllNodesAndEdges, undoOperation, redoOperation],
	);
}
