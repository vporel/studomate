"use client";

import GrafcetConnection, { GrafcetConnectionData } from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { applyNodeChanges, OnNodesChange, useReactFlow } from "@xyflow/react";
import { Dispatch, SetStateAction, useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { GrafcetNode } from "./grafcet-nodes-definitions";

export default function useNodesHandlers(setNodes: Dispatch<SetStateAction<GrafcetNode[]>>): {
	onNodesChange: OnNodesChange<GrafcetNode>;
	onNodesDelete: (deleted: GrafcetNode[]) => void;
	onNodeDragStop: (event: any, node: GrafcetNode, nodes: GrafcetNode[]) => void;
} {
	const { getNodeConnections, getEdge, getNode } = useReactFlow();
	const { elementsEvents } = useGrafcetContext();

	return {
		onNodesChange: useCallback(
			(changes) => {
				setNodes((nds) => applyNodeChanges(changes, nds));
			},
			[setNodes]
		),
		onNodesDelete: useCallback(
			(deleted: GrafcetNode[]) => {
				const connections: GrafcetConnection[] = [];
				for (const n of deleted) {
					for (const nc of [
						...getNodeConnections({ nodeId: n.id, type: "source" }),
						...getNodeConnections({ nodeId: n.id, type: "target" }),
					]) {
						const edge = getEdge(nc.edgeId);
						if (edge) {
							connections.push(
								new GrafcetConnection(
									edge.id,
									{
										id: edge.source,
										type: getNode(edge.source)!.type as GrafcetElementType,
										handleId: edge.sourceHandle!,
									},
									{
										id: edge.target,
										type: getNode(edge.target)!.type as GrafcetElementType,
										handleId: edge.targetHandle!,
									},
									edge.data as GrafcetConnectionData
								)
							);
						}
					}
				}
				elementsEvents.emit("remove", { elements: deleted, connections });
			},
			[elementsEvents, getEdge, getNode, getNodeConnections]
		),
		onNodeDragStop: useCallback(
			(_: any, __: GrafcetNode, nodes: GrafcetNode[]) => {
				const connections: GrafcetConnection[] = [];
				for (const n of nodes) {
					for (const nc of [
						...getNodeConnections({ nodeId: n.id, type: "source" }),
						...getNodeConnections({ nodeId: n.id, type: "target" }),
					]) {
						const edge = getEdge(nc.edgeId);
						if (edge) {
							connections.push(
								new GrafcetConnection(
									edge.id,
									{
										id: edge.source,
										type: getNode(edge.source)!.type as GrafcetElementType,
										handleId: edge.sourceHandle!,
									},
									{
										id: edge.target,
										type: getNode(edge.target)!.type as GrafcetElementType,
										handleId: edge.targetHandle!,
									},
									edge.data as GrafcetConnectionData
								)
							);
						}
					}
				}
				elementsEvents.emit("update", {
					elements: nodes.map((n) => ({ id: n.id, type: n.type, position: n.position })),
					connections,
				});
			},
			[elementsEvents, getEdge, getNode, getNodeConnections]
		),
	};
}
