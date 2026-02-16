"use client";

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetNode } from "./grafcet-nodes-definitions";

export default function useNodesHandlers(): {
	onNodesDelete: (deleted: GrafcetNode[]) => void;
} {
	const { deleteNodes } = useGrafcetStore(
		useShallow((state) => ({
			deleteNodes: state.deleteNodes,
		})),
	);

	const onNodesDelete = useCallback(
		(deleted: GrafcetNode[]) => {
			const deletedIds = deleted.map((n) => n.id);
			deleteNodes(deletedIds);
		},
		[deleteNodes],
	);

	return useMemo(
		() => ({
			onNodesDelete,
		}),
		[onNodesDelete],
	);
}
