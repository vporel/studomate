"use client";

import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { createElementId } from "@/schemas/schemas-helpers";
import { addEdge, applyEdgeChanges, Connection, OnEdgesChange, useReactFlow } from "@xyflow/react";
import { ConnectionMode, getEdgePosition } from "@xyflow/system";
import { Dispatch, SetStateAction, useCallback } from "react";
import { getConnectionLinePoints } from "../connections-lines/CustomConnectionLine";
import { useGrafcetContext } from "../context/GrafcetContext";
import { GrafcetEdge } from "./grafcet-nodes-definitions";

export default function useEdgesHandlers(setEdges: Dispatch<SetStateAction<GrafcetEdge[]>>): {
	onEdgesChange: OnEdgesChange<GrafcetEdge>;
	onConnect: (params: Connection) => void;
	onEdgesDelete: (deleted: GrafcetEdge[]) => void;
} {
	const { getInternalNode } = useReactFlow();
	const { connectionsEvents } = useGrafcetContext();

	return {
		onEdgesChange: useCallback(
			(changes) => {
				setEdges((eds) => applyEdgeChanges(changes, eds));
				connectionsEvents.emit(
					"update",
					changes
						.filter((c) => c.type === "replace" && !!c.item)
						.map((c: any) => {
							const fromNode = getInternalNode(c.item.source);
							const toNode = getInternalNode(c.item.target);
							return new GrafcetConnection(
								c.item.id,
								{ type: fromNode!.type as GrafcetElementType, id: c.item.source },
								{ type: toNode!.type as GrafcetElementType, id: c.item.target },
								{
									points: c.item.data?.points ?? [],
								}
							);
						})
				);
			},
			[connectionsEvents, getInternalNode, setEdges]
		),
		onConnect: useCallback(
			(params: Connection) => {
				const id = createElementId();
				setEdges((edgesSnapshot) => addEdge({ ...params, id }, edgesSnapshot));
				const fromNode = getInternalNode(params.source);
				const toNode = getInternalNode(params.target);
				if (!fromNode || !toNode) return;
				const edgePosition = getEdgePosition({
					id,
					sourceNode: fromNode,
					targetNode: toNode,
					sourceHandle: params.sourceHandle || null,
					targetHandle: params.targetHandle || null,
					connectionMode: ConnectionMode.Strict,
				});
				connectionsEvents.emit("add", [
					new GrafcetConnection(
						id,
						{ type: fromNode.type as GrafcetElementType, id: fromNode.id },
						{ type: toNode.type as GrafcetElementType, id: toNode.id },
						{
							points: getConnectionLinePoints(
								edgePosition!.sourceX,
								edgePosition!.sourceY,
								edgePosition!.targetX,
								edgePosition!.targetY
							),
						}
					),
				]);
			},
			[setEdges, getInternalNode, connectionsEvents]
		),
		onEdgesDelete: useCallback(
			(deleted: GrafcetEdge[]) => {
				connectionsEvents.emit(
					"remove",
					deleted.map((e) => {
						const fromNode = getInternalNode(e.source);
						const toNode = getInternalNode(e.target);
						return new GrafcetConnection(
							e.id,
							{ type: fromNode!.type as GrafcetElementType, id: e.source },
							{ type: toNode!.type as GrafcetElementType, id: e.target },
							{
								points: e.data?.points ?? [],
							}
						);
					})
				);
			},
			[connectionsEvents, getInternalNode]
		),
	};
}
