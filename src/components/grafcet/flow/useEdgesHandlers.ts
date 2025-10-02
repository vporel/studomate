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
			},
			[setEdges]
		),
		onConnect: useCallback(
			(params: Connection) => {
				const id = createElementId();
				setEdges((edgesSnapshot) => addEdge({ ...params, id }, edgesSnapshot));
				const sourceNode = getInternalNode(params.source);
				const targetNode = getInternalNode(params.target);
				if (!sourceNode || !targetNode) return;
				const edgePosition = getEdgePosition({
					id,
					sourceNode: sourceNode,
					targetNode: targetNode,
					sourceHandle: params.sourceHandle || null,
					targetHandle: params.targetHandle || null,
					connectionMode: ConnectionMode.Strict,
				});
				connectionsEvents.emit("add", [
					new GrafcetConnection(
						id,
						{
							type: sourceNode.type as GrafcetElementType,
							id: sourceNode.id,
							handleId: params.sourceHandle || "",
						},
						{
							type: targetNode.type as GrafcetElementType,
							id: targetNode.id,
							handleId: params.targetHandle || "",
						},
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
						const sourceNode = getInternalNode(e.source);
						const targetNode = getInternalNode(e.target);
						return new GrafcetConnection(
							e.id,
							{
								type: sourceNode!.type as GrafcetElementType,
								id: e.source,
								handleId: e.sourceHandle || "",
							},
							{
								type: targetNode!.type as GrafcetElementType,
								id: e.target,
								handleId: e.targetHandle || "",
							},
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
