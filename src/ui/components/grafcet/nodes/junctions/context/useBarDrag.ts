"use client";

import { JunctionData } from "@/schemas/grafcet/junction.schema";
import { useGrafcetStore } from "@/ui/components/grafcet/context/GrafcetContext";
import resolveExtremeBranchDrag from "@/ui/utils/grafcet/junction-extreme-branch-drag";
import { GRAFCET_PAGE_DIMENSIONS } from "@/ui/utils/grafcet/grafcet-utils";
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

/** `"first"` / `"last"` si la branche est une extrémité (elle pilote alors la largeur du nœud). */
function branchEdge(
	data: JunctionData,
	pivot: boolean,
	branchId: string | null,
): "first" | "last" | null {
	if (pivot || branchId == null) return null;
	const order = data.branchesOrder;
	if (order.length < 2) return null;
	if (branchId === order[0]) return "first";
	if (branchId === order[order.length - 1]) return "last";
	return null;
}

/**
 * Déplacement à la souris d'un pin de jonction (pivot ou branche). Le grip qui
 * consomme le `onPointerDown` retourné doit porter la classe `nodrag nopan` pour
 * que React Flow n'interprète pas le geste comme un déplacement du nœud.
 *
 * Tirer une branche extrême redimensionne la jonction : la première branche déplace
 * le bord gauche (position + largeur du nœud), la dernière fait varier la largeur.
 * Le pivot et les branches intermédiaires restent bornés à la largeur courante.
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
	nodeX: number,
): (e: React.PointerEvent<HTMLElement>) => void {
	const workflowManager = useGrafcetStore((state) => state.workflowManager);
	const updateNodeInternals = useUpdateNodeInternals();
	const zoom = useStore((s) => s.transform[2]);

	const stateRef = useRef({ currentPosition, zoom, data, nodeX, width });
	stateRef.current = { currentPosition, zoom, data, nodeX, width };

	return useCallback(
		(e: React.PointerEvent<HTMLElement>) => {
			if (e.button !== 0) return;
			e.stopPropagation();

			const grip = e.currentTarget;
			const startClientX = e.clientX;
			const startPosition = stateRef.current.currentPosition;
			const data = stateRef.current.data;
			const edge = branchEdge(data, pivot, branchId);
			grip.setPointerCapture?.(e.pointerId);

			if (edge != null) {
				const baseline = {
					data,
					nodeX: stateRef.current.nodeX,
					width: stateRef.current.width,
				};
				let last: ReturnType<typeof resolveExtremeBranchDrag> | null = null;
				let lastKey = `${baseline.nodeX},${baseline.width}`;

				const onPointerMove = (ev: PointerEvent) => {
					const dx =
						(ev.clientX - startClientX) / (stateRef.current.zoom || 1);
					const resolved = resolveExtremeBranchDrag(
						baseline,
						edge,
						dx,
						GRAFCET_PAGE_DIMENSIONS.width,
					);
					const key = `${resolved.nodeX},${resolved.width}`;
					if (key === lastKey) return;
					lastKey = key;
					last =
						resolved.nodeX === baseline.nodeX &&
						resolved.width === baseline.width
							? null
							: resolved;
					workflowManager.previewJunctionBarPosition(
						nodeId,
						{
							branches: resolved.branches,
							pivotPosition: resolved.pivotPosition,
						},
						{ x: resolved.nodeX, width: resolved.width },
					);
					updateNodeInternals(nodeId);
				};

				const finish = () => {
					grip.removeEventListener("pointermove", onPointerMove);
					grip.removeEventListener("pointerup", finish);
					grip.removeEventListener("pointercancel", finish);
					if (last == null) return;
					workflowManager.applyJunctionBranchDrag(nodeId, {
						branches: last.branches,
						pivotPosition: last.pivotPosition,
						nodeX: last.nodeX,
						width: last.width,
					});
				};

				grip.addEventListener("pointermove", onPointerMove);
				grip.addEventListener("pointerup", finish);
				grip.addEventListener("pointercancel", finish);
				return;
			}

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
