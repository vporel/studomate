"use client";

import { applyEdgeChanges, Connection, OnEdgesChange } from "@xyflow/react";
import { Dispatch, SetStateAction, useCallback } from "react";
import { useShallow } from "zustand/shallow";
import { useGrafcetStore } from "../context/GrafcetContext";
import { GrafcetEdge } from "./grafcet-nodes-definitions";

export default function useEdgesHandlers(setEdges: Dispatch<SetStateAction<GrafcetEdge[]>>): {
	onEdgesChange: OnEdgesChange<GrafcetEdge>;
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
		onEdgesChange: useCallback(
			(changes) => {
				setEdges((eds) => applyEdgeChanges(changes, eds));
			},
			[setEdges],
		),
		onConnect: useCallback(
			(connection: Connection) => {
				onConnect(connection);
			},
			[onConnect],
		),
		onEdgesDelete: useCallback(
			(deleted: GrafcetEdge[]) => {
				const ids = new Set(deleted.map((e) => e.id));
				deleteEdges(Array.from(ids));
			},
			[deleteEdges],
		),
	};
}
