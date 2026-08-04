"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useProjectStore } from "../../projects/ProjectContext";
import { useGrafcetStore } from "../context/GrafcetContext";
import { getPointsForAdding } from "./useAddPointHandler";

export default function usePointPointerEventsHandlers(
	points: [number, number][],
	setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>,
	setPointsForAdding: React.Dispatch<React.SetStateAction<[number, number][]>>,
	edgeId: string,
) {
	const { screenToFlowPosition } = useReactFlow();
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const projectMode = useProjectStore((state) => state.mode);

	const handlePointPointerDown = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			e.stopPropagation();
			if (projectMode !== ProjectMode.DESIGN) return;
			(e.target as SVGCircleElement).setPointerCapture(e.pointerId);
			if (e.buttons === 2) {
				//Right click
				//Delete point on right click
				workflowManager.updateEdgeData(edgeId, (prevData) => {
					const prevPoints = prevData?.points || [];
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
		[setPointsForAdding, workflowManager, edgeId, projectMode],
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
		(e: React.PointerEvent<SVGCircleElement>, _index: number) => {
			(e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
			workflowManager.updateEdgeData(edgeId, { points });
		},
		[workflowManager, edgeId, points],
	);

	return { handlePointPointerDown, handlePointPointerMove, handlePointPointerUp };
}
