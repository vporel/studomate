"use client";

import { applyNodeChanges, OnNodesChange } from "@xyflow/react";
import { Dispatch, SetStateAction, useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { GrafcetNode } from "./grafcet-nodes-definitions";

export default function useNodesHandlers(setNodes: Dispatch<SetStateAction<GrafcetNode[]>>): {
	onNodesChange: OnNodesChange<GrafcetNode>;
	onNodesDelete: (deleted: GrafcetNode[]) => void;
	onNodeDragStop: (event: any, node: GrafcetNode, nodes: GrafcetNode[]) => void;
} {
	const { elementsEvents: nodesEvents } = useGrafcetContext();

	return {
		onNodesChange: useCallback(
			(changes) => {
				setNodes((nds) => applyNodeChanges(changes, nds));
			},
			[setNodes]
		),
		onNodesDelete: (deleted: GrafcetNode[]) => {
			nodesEvents.emit("remove", deleted);
		},
		onNodeDragStop: useCallback(
			(_: any, node: GrafcetNode, nodes: GrafcetNode[]) => {
				nodesEvents.emit("update", nodes);
			},
			[nodesEvents]
		),
	};
}
