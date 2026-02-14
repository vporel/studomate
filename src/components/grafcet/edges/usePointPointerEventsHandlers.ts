"use client";

import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import { getPointsForAdding } from "./useAddPointHandler";

export default function usePointPointerEventsHandlers(
	points: [number, number][],
	setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>,
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>,
	edgeId: string,
) {
	const { screenToFlowPosition } = useReactFlow();
	const updateConnectionData = useGrafcetStore((state) => state.updateConnectionData);

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
		[points, setPoints, setPointsForAdding],
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
		[screenToFlowPosition, setPoints, setPointsForAdding],
	);

	const handlePointPointerUp = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			(e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
			updateConnectionData(edgeId, { points });
		},
		[updateConnectionData, edgeId, points],
	);

	return { handlePointPointerDown, handlePointPointerMove, handlePointPointerUp };
}
