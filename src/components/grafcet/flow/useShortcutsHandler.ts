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
			const isInput =
				(e.target as HTMLElement).tagName === "INPUT" ||
				(e.target as HTMLElement).tagName === "TEXTAREA";
			if (isInput) return; //Don't trigger shortcuts when the user is typing in an input or textarea
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
