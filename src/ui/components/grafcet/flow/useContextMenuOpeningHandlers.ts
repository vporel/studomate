"use client";

import { useReactFlow } from "@xyflow/react";
import React, { useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";

export default function useContextMenuOpeningHandlers(): {
	onPaneContextMenu: (e: React.MouseEvent) => void;
	onNodeContextMenu: (e: React.MouseEvent, node: any) => void;
	onEdgeContextMenu: (e: React.MouseEvent, edge: any) => void;
} {
	const { screenToFlowPosition } = useReactFlow();
	const { contextMenuEvents } = useGrafcetContext();

	return {
		onPaneContextMenu: useCallback(
			(e: React.MouseEvent) => {
				e.preventDefault();
				contextMenuEvents.emit("show", {
					element: { type: "pane" },
					position: screenToFlowPosition({
						x: e.pageX,
						y: e.pageY,
					}),
				});
			},
			[contextMenuEvents, screenToFlowPosition]
		),
		onNodeContextMenu: useCallback(
			(e: React.MouseEvent, node: any) => {
				e.preventDefault();
				contextMenuEvents.emit("show", {
					element: node,
					position: screenToFlowPosition({
						x: e.pageX,
						y: e.pageY,
					}),
				});
			},
			[contextMenuEvents, screenToFlowPosition]
		),
		onEdgeContextMenu: useCallback(
			(e: React.MouseEvent, edge: any) => {
				e.preventDefault();
				contextMenuEvents.emit("show", {
					element: edge,
					position: screenToFlowPosition({
						x: e.pageX,
						y: e.pageY,
					}),
				});
			},
			[contextMenuEvents, screenToFlowPosition]
		),
	};
}
