import Action from "@/schemas/grafcet/Action.class";
import Comment from "@/schemas/grafcet/Comment.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import Junction from "@/schemas/grafcet/Junction.class";
import Step from "@/schemas/grafcet/Step.class";
import StepReferral from "@/schemas/grafcet/StepReferral.class";
import StepReferralSource from "@/schemas/grafcet/StepReferralSource.class";
import StepReferralTarget from "@/schemas/grafcet/StepReferralTarget.class";
import Transition from "@/schemas/grafcet/Transition.class";
import { Dimensions } from "@xyflow/react";
import CustomEdge, { CustomEdgeType } from "../edges/CustomEdge";
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
export type GrafcetEdgeType = CustomEdgeType; //List of all the edges types

export const NODES_DEFAULT_DIMENSIONS: Record<GrafcetElementType, Dimensions> = {
	step: Step.DEFAULT_DIMENSIONS,
	action: Action.DEFAULT_DIMENSIONS,
	transition: Transition.DEFAULT_DIMENSIONS,
	"step-referral-source": StepReferral.DEFAULT_DIMENSIONS,
	"step-referral-target": StepReferral.DEFAULT_DIMENSIONS,
	"junction-or-start": Junction.DEFAULT_DIMENSIONS,
	"junction-or-end": Junction.DEFAULT_DIMENSIONS,
	"junction-and-start": Junction.DEFAULT_DIMENSIONS,
	"junction-and-end": Junction.DEFAULT_DIMENSIONS,
	comment: Comment.DEFAULT_DIMENSIONS,
};

export const NODES_DEFAULT_DATA_GENERATORS: Record<GrafcetElementType, any> = {
	step: Step.generateDefaultData,
	action: Action.generateDefaultData,
	transition: Transition.generateDefaultData,
	"step-referral-source": StepReferralSource.generateDefaultData,
	"step-referral-target": StepReferralTarget.generateDefaultData,
	"junction-or-start": Junction.generateDefaultData,
	"junction-or-end": Junction.generateDefaultData,
	"junction-and-start": Junction.generateDefaultData,
	"junction-and-end": Junction.generateDefaultData,
	comment: Comment.generateDefaultData,
};

export const nodeTypes: Record<GrafcetElementType, any> = {
	step: StepNode,
	action: ActionNode,
	transition: TransitionNode,
	"step-referral-source": StepReferralSourceNode,
	"step-referral-target": StepReferralTargetNode,
	"junction-or-start": JunctionOrStartNode,
	"junction-or-end": JunctionOrEndNode,
	"junction-and-start": JunctionAndStartNode,
	"junction-and-end": JunctionAndEndNode,
	comment: CommentNode,
};

export const edgeTypes = {
	"custom-edge": CustomEdge,
};
