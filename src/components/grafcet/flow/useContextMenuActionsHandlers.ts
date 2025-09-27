"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect } from "react";
import { GrafcetContextMenuPaneAction, useGrafcetContext } from "../context/GrafcetContext";

export default function useContextMenuActionsHandlers() {
	const { contextMenuEvents } = useGrafcetContext();
	const { setNodes, setEdges } = useReactFlow();

	//Pane actions
	useEffect(() => {
		const handler = (action: GrafcetContextMenuPaneAction) => {
			switch (action.type) {
				case "select-all": {
					setNodes((nds) => nds.map((n) => ({ ...n, selected: true })));
					setEdges((eds) => eds.map((ed) => ({ ...ed, selected: true })));
					break;
				}
				case "select-all-edges": {
					setEdges((eds) => eds.map((ed) => ({ ...ed, selected: true })));
					break;
				}
			}
		};
		contextMenuEvents.on("pane-action", handler);

		return () => {
			contextMenuEvents.off("pane-action", handler);
		};
	}, [contextMenuEvents, setEdges, setNodes]);
}
