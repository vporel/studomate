"use client";

import { Connection } from "@xyflow/react";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetEdge } from "./grafcet-nodes-definitions";

export default function useEdgesHandlers(): {
	onConnect: (params: Connection) => void;
	onEdgesDelete: (deleted: GrafcetEdge[]) => void;
} {
	const { onConnect, deleteEdges } = useGrafcetStore(
		useShallow((state) => ({
			onConnect: state.onConnect,
			deleteEdges: state.deleteEdges,
		})),
	);

	return {
		onConnect: useCallback(
			(connection: Connection) => {
				onConnect(connection);
			},
			[onConnect],
		),
		onEdgesDelete: useCallback(
			(deleted: GrafcetEdge[]) => {
				deleteEdges(Array.from(new Set(deleted.map((e) => e.id))));
			},
			[deleteEdges],
		),
	};
}
