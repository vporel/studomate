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
	const updateEdgeData = useGrafcetStore((state) => state.updateEdgeData);

	const handlePointPointerDown = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			e.stopPropagation();
			(e.target as SVGCircleElement).setPointerCapture(e.pointerId);
			if (e.buttons === 2) {
				//Right click
				//Delete point on right click
				updateEdgeData(edgeId, (prevData) => {
					const prevPoints = prevData.points;
					if (index > 0 && index < prevPoints.length - 1) {
						const newPoints = [...prevPoints];
						newPoints.splice(index, 1);
						setPointsForAdding(getPointsForAdding(newPoints));
						return { points: newPoints };
					}
					return {};
				});
			}
		},
		[setPointsForAdding, updateEdgeData, edgeId],
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
			updateEdgeData(edgeId, { points });
		},
		[updateEdgeData, edgeId, points],
	);

	return { handlePointPointerDown, handlePointPointerMove, handlePointPointerUp };
}
