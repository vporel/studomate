"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";

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
): {
	pointsForAdding: [number, number][];
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>;
	addPoint: (index: number) => void;
} {
	const [pointsForAdding, setPointsForAdding] = useState<[number, number][]>(getPointsForAdding(points));
	const updateConnectionData = useGrafcetStore((state) => state.updateConnectionData);

	const addPoint = useCallback(
		(index: number) => {
			let newPoints: [number, number][] = [];
			setPoints((pts) => {
				newPoints = [...pts];
				newPoints.splice(index + 1, 0, pointsForAdding[index]);
				return newPoints;
			});
			updateConnectionData(edgeId, { points: newPoints });
		},
		[updateConnectionData, edgeId, pointsForAdding, setPoints],
	);

	//Create the points for adding
	useEffect(() => {
		setPointsForAdding(getPointsForAdding(points));
	}, [points]);

	return { pointsForAdding, setPointsForAdding, addPoint };
}
