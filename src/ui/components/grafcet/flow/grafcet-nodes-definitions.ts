import Action from "@/schemas/grafcet/action.schema";
import Comment from "@/schemas/grafcet/comment.schema";
import { ElementType, ElementConstructor } from "@/schemas/grafcet/element.schema";
import JunctionOrStart from "@/schemas/grafcet/junction-or-start.schema";
import JunctionOrEnd from "@/schemas/grafcet/junction-or-end.schema";
import JunctionAndStart from "@/schemas/grafcet/junction-and-start.schema";
import JunctionAndEnd from "@/schemas/grafcet/junction-and-end.schema";
import StepReferralSource from "@/schemas/grafcet/step-referral-source.schema";
import StepReferralTarget from "@/schemas/grafcet/step-referral-target.schema";
import Step from "@/schemas/grafcet/step.schema";
import Transition from "@/schemas/grafcet/transition.schema";

import GrafcetConnectionEdge, { GrafcetConnectionEdgeType } from "../edges/GrafcetConnectionEdge";
import ActionNode, { ActionNodeType } from "../nodes/ActionNode";
import CommentNode, { CommentNodeType } from "../nodes/CommentNode";
import JunctionAndEndNode, { JunctionAndEndNodeType } from "../nodes/junctions/JunctionAndEndNode";
import JunctionAndStartNode, { JunctionAndStartNodeType } from "../nodes/junctions/JunctionAndStartNode";
import JunctionOrEndNode, { JunctionOrEndNodeType } from "../nodes/junctions/JunctionOrEndNode";
import JunctionOrStartNode, { JunctionOrStartNodeType } from "../nodes/junctions/JunctionOrStartNode";
import StepNode, { StepNodeType } from "../nodes/StepNode";
import StepReferralSourceNode, { StepReferralSourceNodeType } from "../nodes/StepReferralSourceNode";
import StepReferralTargetNode, { StepReferralTargetNodeType } from "../nodes/StepReferralTargetNode";
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

export const GRAFCET_ELEMENTS_CONFIG: Record<ElementType, { elementClass: ElementConstructor<any>; nodeType: any }> = {
	step: { elementClass: Step, nodeType: StepNode },
	action: { elementClass: Action, nodeType: ActionNode },
	transition: { elementClass: Transition, nodeType: TransitionNode },
	"step-referral-source": { elementClass: StepReferralSource, nodeType: StepReferralSourceNode },
	"step-referral-target": { elementClass: StepReferralTarget, nodeType: StepReferralTargetNode },
	"junction-or-start": { elementClass: JunctionOrStart, nodeType: JunctionOrStartNode },
	"junction-or-end": { elementClass: JunctionOrEnd, nodeType: JunctionOrEndNode },
	"junction-and-start": { elementClass: JunctionAndStart, nodeType: JunctionAndStartNode },
	"junction-and-end": { elementClass: JunctionAndEnd, nodeType: JunctionAndEndNode },
	comment: { elementClass: Comment, nodeType: CommentNode },
};

export const nodeTypes = Object.fromEntries(
	Object.entries(GRAFCET_ELEMENTS_CONFIG).map(([type, config]) => [type, config.nodeType])
);

export const edgeTypes = {
	"grafcet-connection": GrafcetConnectionEdge,
};
