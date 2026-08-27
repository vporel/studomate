"use client";

import React, { useCallback } from "react";
import useFlowContextMenu from "@/ui/lib/hooks/useFlowContextMenu";
import { useGrafcetContext } from "../context/GrafcetContext";

export default function useContextMenuOpeningHandlers(): {
	onPaneContextMenu: (e: React.MouseEvent | MouseEvent) => void;
	onNodeContextMenu: (e: React.MouseEvent | MouseEvent, node: any) => void;
	onEdgeContextMenu: (e: React.MouseEvent | MouseEvent, edge: any) => void;
} {
	const { contextMenuEvents } = useGrafcetContext();
	const { openContextMenu } = useFlowContextMenu(contextMenuEvents);

	return {
		onPaneContextMenu: useCallback(
			(e: React.MouseEvent | MouseEvent) => {
				openContextMenu(e, { type: "pane" });
			},
			[openContextMenu],
		),
		onNodeContextMenu: useCallback(
			(e: React.MouseEvent | MouseEvent, node: any) => {
				openContextMenu(e, node);
			},
			[openContextMenu],
		),
		onEdgeContextMenu: useCallback(
			(e: React.MouseEvent | MouseEvent, edge: any) => {
				openContextMenu(e, edge);
			},
			[openContextMenu],
		),
	};
}
