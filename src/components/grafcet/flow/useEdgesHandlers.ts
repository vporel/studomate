"use client";

import { Connection } from "@xyflow/react";
import { useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetEdgeType } from "./grafcet-nodes-definitions";

export default function useEdgesHandlers(): {
	onConnect: (params: Connection) => void;
	onEdgesDelete: (deleted: GrafcetEdgeType[]) => void;
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
			(deleted: GrafcetEdgeType[]) => {
				deleteEdges(Array.from(new Set(deleted.map((e) => e.id))));
			},
			[deleteEdges],
		),
	};
}
