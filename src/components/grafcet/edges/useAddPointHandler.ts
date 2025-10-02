"use client";

import GrafcetConnection from "@/schemas/grafcet/GrafcetConnection.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import { InternalNode, Node } from "@xyflow/react";
import React, { useCallback, useEffect, useState } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";

export function getPointsForAdding(points: [number, number][]): [number, number][] {
	const pointsForAdding: [number, number][] = [];
	for (let i = 1; i < points.length; i++)
		pointsForAdding.push([(points[i][0] + points[i - 1][0]) / 2, (points[i][1] + points[i - 1][1]) / 2]);
	return pointsForAdding;
}

export default function useAddPointHandler(
	points: [number, number][],
	setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>,
	edgeId: string,
	sourceNode: InternalNode<Node> | undefined,
	sourceHandleId: string | undefined | null,
	targetNode: InternalNode<Node> | undefined,
	targetHandleId: string | undefined | null
): {
	pointsForAdding: [number, number][];
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>;
	addPoint: (index: number) => void;
} {
	const [pointsForAdding, setPointsForAdding] = useState<[number, number][]>(getPointsForAdding(points));
	const { connectionsEvents } = useGrafcetContext();

	const addPoint = useCallback(
		(index: number) => {
			let newPoints: [number, number][] = [];
			setPoints((pts) => {
				newPoints = [...pts];
				newPoints.splice(index + 1, 0, pointsForAdding[index]);
				return newPoints;
			});
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
						points: newPoints,
					}
				),
			]);
		},
		[
			connectionsEvents,
			edgeId,
			pointsForAdding,
			setPoints,
			sourceHandleId,
			sourceNode,
			targetHandleId,
			targetNode,
		]
	);

	//Create the points for adding
	useEffect(() => {
		setPointsForAdding(getPointsForAdding(points));
	}, [points]);

	return { pointsForAdding, setPointsForAdding, addPoint };
}
