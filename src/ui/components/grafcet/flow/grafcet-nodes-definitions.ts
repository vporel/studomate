import { GRAFCET_ELEMENT_CLASSES } from "@/ui/utils/grafcet/grafcet-element-classes";
import {
	ElementConstructor,
	ElementType,
} from "@/schemas/grafcet/element.schema";

import GrafcetConnectionEdge, {
	GrafcetConnectionEdgeType,
} from "../edges/GrafcetConnectionEdge";
import ActionNode, { ActionNodeType } from "../nodes/ActionNode";
import CommentNode, { CommentNodeType } from "../nodes/CommentNode";
import JunctionAndEndNode, {
	JunctionAndEndNodeType,
} from "../nodes/junctions/JunctionAndEndNode";
import JunctionAndStartNode, {
	JunctionAndStartNodeType,
} from "../nodes/junctions/JunctionAndStartNode";
import JunctionOrEndNode, {
	JunctionOrEndNodeType,
} from "../nodes/junctions/JunctionOrEndNode";
import JunctionOrStartNode, {
	JunctionOrStartNodeType,
} from "../nodes/junctions/JunctionOrStartNode";
import StepNode, { StepNodeType } from "../nodes/StepNode";
import StepReferralSourceNode, {
	StepReferralSourceNodeType,
} from "../nodes/StepReferralSourceNode";
import StepReferralTargetNode, {
	StepReferralTargetNodeType,
} from "../nodes/StepReferralTargetNode";
import TransitionNode, { TransitionNodeType } from "../nodes/TransitionNode";

export type JunctionNodeType =
	| JunctionOrStartNodeType
	| JunctionOrEndNodeType
	| JunctionAndStartNodeType
	| JunctionAndEndNodeType;
export type GrafcetNodeType =
	| StepNodeType
	| ActionNodeType
	| TransitionNodeType
	| StepReferralSourceNodeType
	| StepReferralTargetNodeType
	| JunctionNodeType //List of all the node types
	| CommentNodeType;
export type GrafcetEdgeType = GrafcetConnectionEdgeType; //List of all the edges types

export const GRAFCET_ELEMENTS_CONFIG: Record<
	ElementType,
	{ elementClass: ElementConstructor<any>; nodeType: any }
> = {
	step: { elementClass: GRAFCET_ELEMENT_CLASSES["step"], nodeType: StepNode },
	action: {
		elementClass: GRAFCET_ELEMENT_CLASSES["action"],
		nodeType: ActionNode,
	},
	transition: {
		elementClass: GRAFCET_ELEMENT_CLASSES["transition"],
		nodeType: TransitionNode,
	},
	"step-referral-source": {
		elementClass: GRAFCET_ELEMENT_CLASSES["step-referral-source"],
		nodeType: StepReferralSourceNode,
	},
	"step-referral-target": {
		elementClass: GRAFCET_ELEMENT_CLASSES["step-referral-target"],
		nodeType: StepReferralTargetNode,
	},
	"junction-or-start": {
		elementClass: GRAFCET_ELEMENT_CLASSES["junction-or-start"],
		nodeType: JunctionOrStartNode,
	},
	"junction-or-end": {
		elementClass: GRAFCET_ELEMENT_CLASSES["junction-or-end"],
		nodeType: JunctionOrEndNode,
	},
	"junction-and-start": {
		elementClass: GRAFCET_ELEMENT_CLASSES["junction-and-start"],
		nodeType: JunctionAndStartNode,
	},
	"junction-and-end": {
		elementClass: GRAFCET_ELEMENT_CLASSES["junction-and-end"],
		nodeType: JunctionAndEndNode,
	},
	comment: {
		elementClass: GRAFCET_ELEMENT_CLASSES["comment"],
		nodeType: CommentNode,
	},
};

export const nodeTypes = Object.fromEntries(
	Object.entries(GRAFCET_ELEMENTS_CONFIG).map(([type, config]) => [
		type,
		config.nodeType,
	]),
);

export const edgeTypes = {
	"grafcet-connection": GrafcetConnectionEdge,
};
