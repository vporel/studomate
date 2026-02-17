"use client";

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetNodeType } from "./grafcet-nodes-definitions";

export default function useNodesHandlers(): {
	onNodesDelete: (deleted: GrafcetNodeType[]) => void;
} {
	const { deleteNodes } = useGrafcetStore(
		useShallow((state) => ({
			deleteNodes: state.deleteNodes,
		})),
	);

	const onNodesDelete = useCallback(
		(deleted: GrafcetNodeType[]) => {
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
