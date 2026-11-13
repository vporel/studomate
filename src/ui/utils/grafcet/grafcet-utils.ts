import Connection from "@/schemas/grafcet//connection.schema";
import { ElementType } from "@/schemas/grafcet/element.schema";
import { ACTION_HANDLE_SOURCE_NEXT } from "@/schemas/grafcet/action.schema";
import { STEP_HANDLE_SOURCE_ACTION } from "@/schemas/grafcet/step.schema";
import { GrafcetEdgeType } from "@/ui/components/grafcet/flow/grafcet-nodes-definitions";
import {
	InternalNode,
	Node,
	ReactFlowInstance,
	Connection as XYFlowConnection,
} from "@xyflow/react";

const CONNECTION_LINE_Y_OFFSET = 20;
/** Offset, in px, between the ends of a link below which it is drawn straight. */
const STRAIGHT_LINK_TOLERANCE = 3;
/**
 * Distance, in px, up to which a target behind its source (above it for a vertical link, left of it
 * for a horizontal one) is still reached directly: elements that touch or slightly overlap.
 */
const CONNECTION_RETURN_MIN_BACKTRACK = 10;

/** Dimensions en pixels de la surface de dessin d'un GRAFCET : une page A4 portrait
 * (210 × 297 mm à 96 dpi). Taille fixe — le format n'est pas configurable. */
export const GRAFCET_PAGE_DIMENSIONS = { width: 794, height: 1123 };

/** Area of the page the elements are kept in and the view is limited to (React Flow `nodeExtent` and `translateExtent`). */
export const GRAFCET_PAGE_EXTENT: [[number, number], [number, number]] = [
	[0, 0],
	[GRAFCET_PAGE_DIMENSIONS.width - 2, GRAFCET_PAGE_DIMENSIONS.height - 2],
];

/** Zoom that fits the page width in a container `containerWidth` wide, between `minZoom` and 1. */
export function getPageFitZoom(
	containerWidth: number,
	minZoom: number,
): number {
	return Math.min(
		1,
		Math.max(minZoom, containerWidth / GRAFCET_PAGE_DIMENSIONS.width),
	);
}

/**
 * Whether two ends of a link, offset by `offset` across its direction, are aligned: the link
 * between them is then drawn straight.
 */
export function isStraightLinkOffset(offset: number): boolean {
	return Math.abs(offset) < STRAIGHT_LINK_TOLERANCE;
}

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
	// Below CONNECTION_RETURN_MIN_BACKTRACK, two elements that merely touch do not form a loop.
	if (fromY - toY > CONNECTION_RETURN_MIN_BACKTRACK) {
		const downY = fromY + CONNECTION_LINE_Y_OFFSET;
		points.push([fromX, fromY]);
		points.push([fromX, downY]);
		const horizontalX = Math.min(fromX, toX) - 40; //Start with a left shift (convention)
		points.push([horizontalX, downY]);
		points.push([horizontalX, toY - CONNECTION_LINE_Y_OFFSET]);
		points.push([toX, toY - CONNECTION_LINE_Y_OFFSET]);
		points.push([toX, toY]);
	} else if (isStraightLinkOffset(fromX - toX)) {
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

/**
 * Route of a link leaving an element from its side (step → action): always orthogonal,
 * horizontal when leaving and entering. Horizontal counterpart of `getConnectionLinePoints`.
 */
export function getHorizontalConnectionLinePoints(
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
): [number, number][] {
	const aligned = isStraightLinkOffset(fromY - toY);
	if (fromX - toX <= CONNECTION_RETURN_MIN_BACKTRACK) {
		if (aligned)
			return [
				[fromX, fromY],
				[toX, toY],
			];
		const midX = (fromX + toX) / 2;
		return [
			[fromX, fromY],
			[midX, fromY],
			[midX, toY],
			[toX, toY],
		];
	}
	// Target well left of the source: detour, stepping out by CONNECTION_LINE_Y_OFFSET on each side.
	const outX = fromX + CONNECTION_LINE_Y_OFFSET;
	const inX = toX - CONNECTION_LINE_Y_OFFSET;
	const midY = aligned
		? fromY - 2 * CONNECTION_LINE_Y_OFFSET
		: (fromY + toY) / 2;
	return [
		[fromX, fromY],
		[outX, fromY],
		[outX, midY],
		[inX, midY],
		[inX, toY],
		[toX, toY],
	];
}

/** Source handles on the side of an element, whose links leave and enter horizontally. */
const HORIZONTAL_SOURCE_HANDLES: (string | null | undefined)[] = [
	STEP_HANDLE_SOURCE_ACTION,
	ACTION_HANDLE_SOURCE_NEXT,
];

/** Route of a link according to its source handle: horizontal from the action handle of a step or the next handle of an action. */
export function getHandleConnectionLinePoints(
	sourceHandle: string | null | undefined,
	fromX: number,
	fromY: number,
	toX: number,
	toY: number,
): [number, number][] {
	return HORIZONTAL_SOURCE_HANDLES.includes(sourceHandle)
		? getHorizontalConnectionLinePoints(fromX, fromY, toX, toY)
		: getConnectionLinePoints(fromX, fromY, toX, toY);
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
	return getHandleConnectionLinePoints(
		connection.sourceHandle,
		fromX,
		fromY,
		toX,
		toY,
	).slice(1, -1);
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
