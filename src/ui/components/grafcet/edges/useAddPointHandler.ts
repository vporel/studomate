"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import React, { useCallback, useEffect, useState } from "react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "../context/GrafcetContext";

export function getPointsForAdding(
	points: [number, number][],
): [number, number][] {
	const pointsForAdding: [number, number][] = [];
	for (let i = 1; i < points.length; i++)
		pointsForAdding.push([
			(points[i][0] + points[i - 1][0]) / 2,
			(points[i][1] + points[i - 1][1]) / 2,
		]);
	return pointsForAdding;
}

/**
 * `vertices` est la liste complète des sommets du tracé (`[source, ...coudes, target]`), pour
 * placer un marqueur d'ajout au milieu de chaque segment. `addPoint(segmentIndex)` insère un
 * nouveau coude à `segmentIndex` dans `data.points` (qui ne porte que les coudes) : le segment
 * `k` est entre le sommet `k` et le sommet `k + 1`, donc le nouveau coude s'y place à l'indice
 * `k` du tableau des coudes.
 */
export default function useAddPointHandler(
	vertices: [number, number][],
	edgeId: string,
): {
	pointsForAdding: [number, number][];
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>;
	addPoint: (segmentIndex: number) => void;
} {
	const [pointsForAdding, setPointsForAdding] = useState<[number, number][]>(
		getPointsForAdding(vertices),
	);
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const projectMode = useProjectStore((state) => state.mode);

	const addPoint = useCallback(
		(segmentIndex: number) => {
			if (projectMode !== ProjectMode.DESIGN) return;
			workflowManager.updateEdgeData(edgeId, (prevData) => {
				const newPoints = [...(prevData?.points || [])];
				newPoints.splice(segmentIndex, 0, pointsForAdding[segmentIndex]);
				return {
					points: newPoints,
				};
			});
		},
		[workflowManager, edgeId, pointsForAdding, projectMode],
	);

	useEffect(() => {
		setPointsForAdding(getPointsForAdding(vertices));
	}, [vertices]);

	return { pointsForAdding, setPointsForAdding, addPoint };
}
