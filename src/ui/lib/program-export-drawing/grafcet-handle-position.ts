import Element from "@/schemas/grafcet/element.schema";
import {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_TARGET_PREDECESSOR,
} from "@/schemas/grafcet/step.schema";
import { TRANSITION_HANDLE_TARGET_PREDECESSOR } from "@/schemas/grafcet/transition.schema";
import { JUNCTION_HANDLE_PIVOT, JunctionData } from "@/schemas/grafcet/junction.schema";

export type Point = [number, number];

/**
 * Position absolue (coordonnées flow) d'un handle d'un élément grafcet, dérivée de sa position
 * et de son type. Reproduit ce que React Flow mesure au rendu — utilisé par le renderer SVG,
 * qui ne monte pas l'éditeur.
 */
export default function grafcetHandlePosition(
	element: Element<unknown>,
	handle: string,
): Point {
	const { x, y } = element.position;
	const { width: w, height: h } = element.size;

	switch (element.type) {
		case "step":
			if (handle === STEP_HANDLE_TARGET_PREDECESSOR) return [x + w / 2, y];
			if (handle === STEP_HANDLE_SOURCE_ACTION) return [x + w, y + h / 2];
			return [x + w / 2, y + h]; // successor
		case "transition":
			if (handle === TRANSITION_HANDLE_TARGET_PREDECESSOR) return [x + w / 2, y];
			return [x + w / 2, y + h]; // successor
		case "action":
			return [x, y + h / 2]; // target:step, sur le bord gauche
		case "step-referral-source":
			return [x + w / 2, y]; // target:predecessor, en haut
		case "step-referral-target":
			return [x + w / 2, y + h]; // source:successor, en bas
		case "comment":
			return [x + w / 2, y + h / 2];
		case "junction-and-start":
		case "junction-or-start": {
			// Pivot en haut (reçoit d'une transition), branches en bas (vers les étapes).
			const data = element.data as JunctionData;
			if (handle === JUNCTION_HANDLE_PIVOT) return [x + data.pivotPosition, y];
			const branch = data.branches[handle];
			return branch ? [x + branch.position, y + h] : [x + w / 2, y + h];
		}
		case "junction-and-end":
		case "junction-or-end": {
			// Pivot en bas (vers une transition), branches en haut (depuis les étapes).
			const data = element.data as JunctionData;
			if (handle === JUNCTION_HANDLE_PIVOT) return [x + data.pivotPosition, y + h];
			const branch = data.branches[handle];
			return branch ? [x + branch.position, y] : [x + w / 2, y];
		}
	}
	return [x + w / 2, y + h / 2];
}
