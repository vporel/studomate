"use client";

import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { InternalNode, Node, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import { getPointsForAdding } from "./useAddPointHandler";

export default function usePointPointerEventsHandlers(
	points: [number, number][],
	setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>,
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>,
	edgeId: string,
	sourceNode: InternalNode<Node> | undefined,
	sourceHandleId: string | undefined | null,
	targetNode: InternalNode<Node> | undefined,
	targetHandleId: string | undefined | null
) {
	const { screenToFlowPosition } = useReactFlow();
	const { connectionsEvents } = useGrafcetContext();

	const handlePointPointerDown = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			e.stopPropagation();
			(e.target as SVGCircleElement).setPointerCapture(e.pointerId);
			if (e.buttons === 2) {
				//Right click
				//Delete point on right click
				if (index > 0 && index < points.length - 1) {
					setPoints((pts) => {
						const newPoints = [...pts];
						newPoints.splice(index, 1);
						setPointsForAdding(getPointsForAdding(newPoints));
						return newPoints;
					});
				}
			}
		},
		[points, setPoints, setPointsForAdding]
	);

	const handlePointPointerMove = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			if (e.buttons !== 1) return;
			const { x, y } = screenToFlowPosition({ x: e.pageX, y: e.pageY });
			setPoints((pts) => {
				const newPoints = [...pts];
				newPoints.splice(index, 1, [x, y]);
				setPointsForAdding(getPointsForAdding(newPoints));
				return newPoints;
			});
		},
		[screenToFlowPosition, setPoints, setPointsForAdding]
	);

	const handlePointPointerUp = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			(e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
			connectionsEvents.emit("update", [
				new GrafcetConnection(
					edgeId,
					{
						type: sourceNode!.type as GrafcetElementType,
						id: sourceNode!.id,
						handleId: sourceHandleId || "",
					},
					{
						type: targetNode!.type as GrafcetElementType,
						id: targetNode!.id,
						handleId: targetHandleId || "",
					},
					{
						points: points,
					}
				),
			]);
		},
		[connectionsEvents, edgeId, points, sourceHandleId, sourceNode, targetHandleId, targetNode]
	);

	return { handlePointPointerDown, handlePointPointerMove, handlePointPointerUp };
}
