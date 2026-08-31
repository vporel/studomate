"use client";

import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import { useStore, useUpdateNodeInternals } from "@xyflow/react";
import React, { useCallback, useRef } from "react";
import {
	resolveBranchPosition,
	resolvePivotPosition,
} from "../branch-position";

/** Construit le patch de données pour placer le pin ciblé à `position`. */
function barPositionPatch(
	data: JunctionData,
	pivot: boolean,
	branchId: string | null,
	position: number,
): Partial<JunctionData> {
	if (pivot) return { pivotPosition: position };
	if (branchId == null) return {};
	return {
		branches: {
			...data.branches,
			[branchId]: { ...data.branches[branchId]!, position },
		},
	};
}

/**
 * Déplacement à la souris d'un pin de jonction (pivot ou branche). Le grip qui
 * consomme le `onPointerDown` retourné doit porter la classe `nodrag nopan` pour
 * que React Flow n'interprète pas le geste comme un déplacement du nœud.
 *
 * Les positions intermédiaires ne sont qu'un aperçu de la vue ; le glisser
 * complet est validé en une seule commande au relâchement.
 */
export default function useBarDrag(
	nodeId: string,
	data: JunctionData,
	pivot: boolean,
	branchId: string | null,
	currentPosition: number,
	width: number,
): (e: React.PointerEvent<HTMLElement>) => void {
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const updateNodeInternals = useUpdateNodeInternals();
	const zoom = useStore((s) => s.transform[2]);

	const stateRef = useRef({ currentPosition, zoom, data });
	stateRef.current = { currentPosition, zoom, data };

	return useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			if (e.button !== 0) return;
			e.stopPropagation();

			const grip = e.currentTarget;
			const startClientX = e.clientX;
			const startPosition = stateRef.current.currentPosition;
			const data = stateRef.current.data;
			grip.setPointerCapture?.(e.pointerId);

			let lastPosition = startPosition;

			const onPointerMove = (ev: PointerEvent) => {
				const dx = (ev.clientX - startClientX) / (stateRef.current.zoom || 1);
				const resolved = pivot
					? resolvePivotPosition(startPosition + dx, width)
					: branchId != null
						? resolveBranchPosition(data, branchId, startPosition + dx, width)
						: null;
				if (resolved == null || resolved === lastPosition) return;
				lastPosition = resolved;
				workflowManager.previewJunctionBarPosition(
					nodeId,
					barPositionPatch(data, pivot, branchId, resolved),
				);
				updateNodeInternals(nodeId);
			};

			const finish = () => {
				grip.removeEventListener("pointermove", onPointerMove);
				grip.removeEventListener("pointerup", finish);
				grip.removeEventListener("pointercancel", finish);
				if (lastPosition === startPosition) return;
				const target = lastPosition;
				workflowManager.updateNodeData(nodeId, (prev) => {
					const prevData = prev as JunctionData;
					const resolved = pivot
						? resolvePivotPosition(target, width)
						: branchId != null
							? resolveBranchPosition(prevData, branchId, target, width)
							: null;
					if (resolved == null) return {};
					return barPositionPatch(prevData, pivot, branchId, resolved);
				});
			};

			grip.addEventListener("pointermove", onPointerMove);
			grip.addEventListener("pointerup", finish);
			grip.addEventListener("pointercancel", finish);
		},
		[nodeId, pivot, branchId, width, workflowManager, updateNodeInternals],
	);
}
