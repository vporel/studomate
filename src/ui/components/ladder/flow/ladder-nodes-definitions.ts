import { LadderElementKind } from "@/schemas/ladder/element.schema";
import { LADDER_CONNECTION_EDGE_TYPE } from "@/ui/utils/ladder/ladder-flow-builder";
import { Dimensions } from "@xyflow/react";
import LadderConnectionEdge from "../edges/LadderConnectionEdge";
import BlockNode, {
	BLOCK_NODE_DIMENSIONS,
	BlockNodeType,
} from "../nodes/block-node/BlockNode";
import CoilNode, {
	COIL_NODE_DIMENSIONS,
	CoilNodeType,
} from "../nodes/CoilNode";
import ContactNode, {
	CONTACT_NODE_DIMENSIONS,
	ContactNodeType,
} from "../nodes/ContactNode";
import RailTerminalNode, {
	RAIL_TERMINAL_NODE_DIMENSIONS,
	RailTerminalNodeType,
} from "../nodes/RailTerminalNode";

export type LadderNodeType =
	ContactNodeType | CoilNodeType | RailTerminalNodeType | BlockNodeType;

export const NODES_DEFAULT_DIMENSIONS: Record<LadderElementKind, Dimensions> = {
	contact: CONTACT_NODE_DIMENSIONS,
	coil: COIL_NODE_DIMENSIONS,
	railTerminal: RAIL_TERMINAL_NODE_DIMENSIONS,
	block: BLOCK_NODE_DIMENSIONS,
};

export const nodeTypes = {
	contact: ContactNode,
	coil: CoilNode,
	railTerminal: RailTerminalNode,
	block: BlockNode,
};

export const edgeTypes = {
	[LADDER_CONNECTION_EDGE_TYPE]: LadderConnectionEdge,
};
