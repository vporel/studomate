"use client";

import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
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
	const projectMode = useProjectStore((state) => state.mode);

	const handlePointPointerDown = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			e.stopPropagation();
			if (projectMode !== ProjectMode.DESIGN) return;
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
		[workflowManager, edgeId, projectMode],
	);

	const handlePointPointerMove = useCallback(
		(e: React.PointerEvent<SVGCircleElement>, index: number) => {
			if (e.buttons !== 1) return;
			const { x, y } = screenToFlowPosition({ x: e.pageX, y: e.pageY });
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
