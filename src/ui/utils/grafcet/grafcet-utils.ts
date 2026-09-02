import Connection from "@/schemas/grafcet//connection.schema";
import { ElementType } from "@/schemas/grafcet/element.schema";
import { GrafcetFormat } from "@/schemas/grafcet/grafcet.schema";
import { GrafcetEdgeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import { PAPERS_SIZES } from "@/ui/constants";
import { mmToPx } from "@/ui/lib/utils";
import {
	ReactFlowInstance,
	Connection as XYFlowConnection,
} from "@xyflow/react";

const CONNECTION_LINE_Y_OFFSET = 20;

export function getConnectionLinePoints(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
): [number, number][] {
	const points: [number, number][] = [];
	// Cible au-dessus de la source : connexion remontante, toujours une boucle de retour en
	// GRAFCET. Contournement orthogonal par la gauche, quel que soit l'écart en X — sinon le
	// tracé dégénère en diagonale à travers les étapes dès qu'on déplace une extrémité.
	if (fromY > toY) {
		const downY = fromY + CONNECTION_LINE_Y_OFFSET;
		points.push([fromX, fromY]);
		points.push([fromX, downY]);
		const horizontalX = Math.min(fromX, toX) - 40; //Start with a left shift (convention)
		points.push([horizontalX, downY]);
		points.push([horizontalX, toY - CONNECTION_LINE_Y_OFFSET]);
		points.push([toX, toY - CONNECTION_LINE_Y_OFFSET]);
		points.push([toX, toY]);
	} else if (Math.abs(fromX - toX) < 3) {
		// Alignées verticalement : liaison droite.
		points.push([fromX, fromY]);
		points.push([toX, toY]);
	} else {
		// Descendante mais désalignée (sortie d'une divergence vers une branche, etc.) :
		// routage orthogonal en S — jamais de diagonale dans un GRAFCET.
		const midY = (fromY + toY) / 2;
		points.push([fromX, fromY]);
		points.push([fromX, midY]);
		points.push([toX, midY]);
		points.push([toX, toY]);
	}
	return points;
}

export function grafcetConnectionFromXYFlowConnectionOrEdge(
	rfInstance: ReactFlowInstance,
	connection: XYFlowConnection | GrafcetEdgeType,
	connectionId: string,
): Connection | null {
	const sourceNode = rfInstance.getInternalNode(connection.source);
	const targetNode = rfInstance.getInternalNode(connection.target);
	if (!sourceNode || !targetNode) return null;
	return new Connection(
		connectionId,
		{
			type: sourceNode.type as ElementType,
			id: sourceNode.id,
			handle: connection.sourceHandle || "",
		},
		{
			type: targetNode.type as ElementType,
			id: targetNode.id,
			handle: connection.targetHandle || "",
		},
		//`data.points` ne porte que les coudes intermédiaires : une nouvelle connexion n'en a
		//aucun, son tracé est dérivé des handles au rendu (`getConnectionLinePoints`).
		(connection as GrafcetEdgeType).data || { points: [] },
	);
}

export function getFlowDimensions(format: GrafcetFormat) {
	switch (format.type) {
		case "A4":
			return {
				width: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A4_PORTRAIT.width
						: PAPERS_SIZES.A4_LANDSCAPE.width,
				),
				height: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A4_PORTRAIT.height
						: PAPERS_SIZES.A4_LANDSCAPE.height,
				),
			};
		case "A3":
			return {
				width: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A3_PORTRAIT.width
						: PAPERS_SIZES.A3_LANDSCAPE.width,
				),
				height: mmToPx(
					format.orientation === "portrait"
						? PAPERS_SIZES.A3_PORTRAIT.height
						: PAPERS_SIZES.A3_LANDSCAPE.height,
				),
			};
	}
}
