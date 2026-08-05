"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import React, { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "../context/GrafcetContext";

export function getPointsForAdding(points: [number, number][]): [number, number][] {
	const pointsForAdding: [number, number][] = [];
	for (let i = 1; i < points.length; i++)
		pointsForAdding.push([(points[i][0] + points[i - 1][0]) / 2, (points[i][1] + points[i - 1][1]) / 2]);
	return pointsForAdding;
}

export default function useAddPointHandler(
	points: [number, number][],
	edgeId: string,
): {
	pointsForAdding: [number, number][];
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>;
	addPoint: (index: number) => void;
} {
	const [pointsForAdding, setPointsForAdding] = useState<[number, number][]>(getPointsForAdding(points));
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const projectMode = useProjectStore((state) => state.mode);

	const addPoint = useCallback(
		(index: number) => {
			if (projectMode !== ProjectMode.DESIGN) return;
			workflowManager.updateEdgeData(edgeId, (prevData) => {
				const newPoints = [...(prevData?.points || [])];
				newPoints.splice(index + 1, 0, pointsForAdding[index]);
				return {
					points: newPoints,
				};
			});
		},
		[workflowManager, edgeId, pointsForAdding, projectMode],
	);

	//Create the points for adding
	useEffect(() => {
		setPointsForAdding(getPointsForAdding(points));
	}, [points]);

	return { pointsForAdding, setPointsForAdding, addPoint };
}
