"use client";

import useCanEdit from "@/ui/components/projects/useCanEdit";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";

/**
 * `points` (et `prevData.points`) ne contient que les coudes intermédiaires — `index` est donc
 * directement l'indice d'un coude, chaque coude est déplaçable et supprimable.
 */
export default function usePointPointerEventsHandlers(
	points: [number, number][],
	setPoints: React.Dispatch<React.SetStateAction<[number, number][]>>,
	edgeId: string,
) {
	const { screenToFlowPosition } = useReactFlow();
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const canEdit = useCanEdit();

	const handlePointPointerDown = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			e.stopPropagation();
			if (!canEdit) return;
			(e.target as SVGCircleElement).setPointerCapture(e.pointerId);
			if (e.buttons === 2) {
				//Right click : delete the coude
				workflowManager.updateEdgeData(edgeId, (prevData) => {
					const prevPoints = prevData?.points || [];
					if (index >= 0 && index < prevPoints.length) {
						const newPoints = [...prevPoints];
						newPoints.splice(index, 1);
						return { points: newPoints };
					}
					return {};
				});
			}
		},
		[workflowManager, edgeId, canEdit],
	);

	const handlePointPointerMove = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			if (e.buttons !== 1) return;
			const { x, y } = screenToFlowPosition({ x: e.clientX, y: e.clientY });
			setPoints((pts) => {
				const newPoints = [...pts];
				newPoints.splice(index, 1, [x, y]);
				return newPoints;
			});
		},
		[screenToFlowPosition, setPoints],
	);

	const handlePointPointerUp = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, _index: number) => {
			(e.target as SVGCircleElement).releasePointerCapture(e.pointerId);
			workflowManager.updateEdgeData(edgeId, { points });
		},
		[workflowManager, edgeId, points],
	);

	return {
		handlePointPointerDown,
		handlePointPointerMove,
		handlePointPointerUp,
	};
}
