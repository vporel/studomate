import Connection from "@/schemas/grafcet//connection.schema";
import { ElementType } from "@/schemas/grafcet/element.schema";
import { GrafcetEdgeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import {
	InternalNode,
	Node,
	ReactFlowInstance,
	Connection as XYFlowConnection,
} from "@xyflow/react";

const CONNECTION_LINE_Y_OFFSET = 20;

/** Dimensions en pixels de la surface de dessin d'un GRAFCET : une page A4 portrait
 * (210 × 297 mm à 96 dpi). Taille fixe — le format n'est pas configurable. */
export const GRAFCET_PAGE_DIMENSIONS = { width: 794, height: 1123 };

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

/** Centre absolu (coords flow) d'un handle, ou le centre du nœud si le handle est introuvable. */
function handleCenter(
	node: InternalNode<Node>,
	handleType: "source" | "target",
	handleId: string,
): [number, number] {
	const { x: nodeX, y: nodeY } = node.internals.positionAbsolute;
	const handle = node.internals.handleBounds?.[handleType]?.find(
		(h) => (h.id ?? "") === handleId,
	);
	if (!handle)
		return [
			nodeX + (node.measured.width ?? 0) / 2,
			nodeY + (node.measured.height ?? 0) / 2,
		];
	return [
		nodeX + handle.x + handle.width / 2,
		nodeY + handle.y + handle.height / 2,
	];
}

/**
 * Coudes intermédiaires du tracé d'une connexion neuve, figés dans `data.points` dès la création
 * pour que le contournement orthogonal (boucle de retour, routage en S) reste éditable — sans
 * eux, le premier ajout/déplacement de coude dégénère le tracé en diagonale. Retourne `[]` pour
 * une liaison droite (extrémités alignées), qui reste alors dérivée des handles au rendu.
 */
export function getInitialConnectionPoints(
	rfInstance: ReactFlowInstance,
	connection: Pick<XYFlowConnection, "source" | "target"> & {
		sourceHandle?: string | null;
		targetHandle?: string | null;
	},
): [number, number][] {
	const sourceNode = rfInstance.getInternalNode(connection.source);
	const targetNode = rfInstance.getInternalNode(connection.target);
	if (!sourceNode || !targetNode) return [];
	const [fromX, fromY] = handleCenter(
		sourceNode,
		"source",
		connection.sourceHandle || "",
	);
	const [toX, toY] = handleCenter(
		targetNode,
		"target",
		connection.targetHandle || "",
	);
	return getConnectionLinePoints(fromX, fromY, toX, toY).slice(1, -1);
}

export function grafcetConnectionFromXYFlowConnectionOrEdge(
	rfInstance: ReactFlowInstance,
	connection: XYFlowConnection | GrafcetEdgeType,
	connectionId: string,
): Connection | null {
	const sourceNode = rfInstance.getInternalNode(connection.source);
	const targetNode = rfInstance.getInternalNode(connection.target);
	if (!sourceNode || !targetNode) return null;
	const data =
		"data" in connection && connection.data
			? connection.data
			: { points: getInitialConnectionPoints(rfInstance, connection) };
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
		data,
	);
}
