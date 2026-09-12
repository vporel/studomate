import { XYPosition } from "@xyflow/react";
import { LadderNodeType } from "../flow/ladder-nodes-definitions";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Edge } from "@xyflow/react";

export type LadderConnectionEdgeType = Edge<
	Record<string, never>,
	typeof LADDER_CONNECTION_EDGE_TYPE
>;

export type LadderContextMenuElement =
	{ type: "pane" } | LadderNodeType | LadderConnectionEdgeType;
export type LadderContextMenuProps = {
	/** Section dont le flow a reçu le clic droit — le bus mitt du menu contextuel est partagé par
	 * toutes les sections du ladder, chaque `LadderContextMenu` ne réagit qu'à la sienne. */
	sectionId: string;
	element: LadderContextMenuElement;
	position: XYPosition;
	screenPosition: XYPosition;
};
