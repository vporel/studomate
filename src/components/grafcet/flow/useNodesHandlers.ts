"use client";

import { applyNodeChanges, NodeChange, OnNodesChange } from "@xyflow/react";
import { Dispatch, SetStateAction, useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetNode } from "./grafcet-nodes-definitions";

export default function useNodesHandlers(setNodes: Dispatch<SetStateAction<GrafcetNode[]>>): {
	onNodesChange: OnNodesChange<GrafcetNode>;
	onNodesDelete: (deleted: GrafcetNode[]) => void;
	onNodeDragStop: (event: any, node: GrafcetNode, nodes: GrafcetNode[]) => void;
} {
	const { deleteNodes, onNodesPositionsChange } = useGrafcetStore(
		useShallow((state) => ({
			deleteNodes: state.deleteNodes,
			onNodesPositionsChange: state.onNodesPositionsChange,
		})),
	);
	const onNodesChange = useCallback(
		(changes: NodeChange<GrafcetNode>[]) => {
			setNodes((nds) => applyNodeChanges(changes, nds));
		},
		[setNodes],
	);

	const onNodesDelete = useCallback(
		(deleted: GrafcetNode[]) => {
			const deletedIds = deleted.map((n) => n.id);
			deleteNodes(deletedIds);
		},
		[deleteNodes],
	);
	const onNodeDragStop = useCallback(
		(_: any, __: GrafcetNode, nodes: GrafcetNode[]) => {
			onNodesPositionsChange(nodes.map((n) => n.id));
		},
		[onNodesPositionsChange],
	);

	return useMemo(
		() => ({
			onNodesChange,
			onNodesDelete,
			onNodeDragStop,
		}),
		[onNodesChange, onNodesDelete, onNodeDragStop],
	);
}
