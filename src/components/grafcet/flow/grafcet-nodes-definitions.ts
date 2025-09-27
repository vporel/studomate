import Action from "@/schemas/grafcet/Action.class";
import Comment from "@/schemas/grafcet/Comment.class";
import { GrafcetElementType } from "@/schemas/grafcet/GrafcetElement.class";
import Junction from "@/schemas/grafcet/junction.class";
import Step from "@/schemas/grafcet/Step.class";
import StepReferral from "@/schemas/grafcet/StepReferral.class";
import StepReferralSource from "@/schemas/grafcet/StepReferralSource.class";
import StepReferralTarget from "@/schemas/grafcet/StepReferralTarget.class";
import Transition from "@/schemas/grafcet/transition.class";
import { Connection, Dimensions, Node } from "@xyflow/react";
import CustomEdge, { CustomEdgeType } from "../edges/CustomEdge";
import ActionNode, { ActionNodeType } from "../nodes/ActionNode";
import CommentNode from "../nodes/CommentNode";
import JunctionAndEndNode, { JunctionAndEndNodeType } from "../nodes/junctions/JunctionAndEndNode";
import JunctionAndStartNode, { JunctionAndStartNodeType } from "../nodes/junctions/JunctionAndStartNode";
import {} from "../nodes/junctions/JunctionNode";
import JunctionOrEndNode, { JunctionOrEndNodeType } from "../nodes/junctions/JunctionOrEndNode";
import JunctionOrStartNode, { JunctionOrStartNodeType } from "../nodes/junctions/JunctionOrStartNode";
import StepNode, { StepNodeType } from "../nodes/StepNode";
import StepReferralSourceNode, { StepReferralSourceNodeType } from "../nodes/StepReferralSourceNode";
import StepReferralTargetNode, { StepReferralTargetNodeType } from "../nodes/StepReferralTargetNode";
import TransitionNode, { TransitionNodeType } from "../nodes/TransitionNode";

export type JunctionNode =
	| JunctionOrStartNodeType
	| JunctionOrEndNodeType
	| JunctionAndStartNodeType
	| JunctionAndEndNodeType;
export type GrafcetNode =
	| StepNodeType
	| ActionNodeType
	| TransitionNodeType
	| StepReferralSourceNodeType
	| StepReferralTargetNodeType
	| JunctionNode; //List of all the node types
export type GrafcetEdge = CustomEdgeType; //List of all the edges types

export const nodesDefaultDimensions: Record<GrafcetElementType, Dimensions> = {
	step: Step.defaultDimensions,
	action: Action.defaultDimensions,
	transition: Transition.defaultDimensions,
	"step-referral-source": StepReferral.defaultDimensions,
	"step-referral-target": StepReferral.defaultDimensions,
	"junction-or-start": Junction.defaultDimensions,
	"junction-or-end": Junction.defaultDimensions,
	"junction-and-start": Junction.defaultDimensions,
	"junction-and-end": Junction.defaultDimensions,
	comment: Comment.defaultDimensions,
};

export const nodesDefaultData: Record<GrafcetElementType, any> = {
	step: Step.defaultData,
	action: Action.defaultData,
	transition: Transition.defaultData,
	"step-referral-source": StepReferralSource.defaultData,
	"step-referral-target": StepReferralTarget.defaultData,
	"junction-or-start": Junction.defaultData,
	"junction-or-end": Junction.defaultData,
	"junction-and-start": Junction.defaultData,
	"junction-and-end": Junction.defaultData,
	comment: Comment.defaultData,
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

export function validateConnection(connection: Connection, nodes: Node[]): boolean {
	const sourceType = nodes.find((n) => n.id == connection.source)!.type as GrafcetElementType;
	const targetType = nodes.find((n) => n.id == connection.target)!.type as GrafcetElementType;

	if (
		sourceType == "step" &&
		!["transition", "action", "junction-or-start", "junction-and-end"].includes(targetType)
	)
		return false;
	if (
		sourceType == "transition" &&
		!["step", "junction-and-start", "junction-or-end", "step-referral-source"].includes(targetType)
	)
		return false;
	if (sourceType == "junction-or-start" && !["transition"].includes(targetType)) return false;
	if (sourceType == "junction-or-end" && !["step"].includes(targetType)) return false;
	if (sourceType == "junction-and-start" && !["step"].includes(targetType)) return false;
	if (sourceType == "junction-and-end" && !["transition"].includes(targetType)) return false;
	if (sourceType == "step-referral-target" && !["step"].includes(targetType)) return false;
	return true;
}

export const testNodes = [
	{
		id: "n1",
		type: "step",
		position: { x: 10, y: 0 },
		data: { number: 0, isInitial: true },
	},
	{
		id: "t1",
		type: "transition",
		position: { x: 0, y: 60 },
		data: { expression: "Transition" },
	},
	{ id: "n2", type: "step", position: { x: 0, y: 110 }, data: { number: 1 } },
	{
		id: "a1",
		type: "action",
		position: { x: 100, y: 110 },
		data: { expression: "Action", width: 100 },
	},
	{ id: "n3", type: "step", position: { x: 0, y: 200 }, data: { number: 2 } },
	{
		id: "sa1",
		type: "step-referral-source",
		position: { x: 0, y: 300 },
		data: { destinationStepNumber: 5 },
	},
	{
		id: "da1",
		type: "step-referral-target",
		position: { x: 0, y: 400 },
		data: { sourceStepNumber: 5 },
	},
	{
		id: "ojs1",
		type: "junction-or-start",
		position: { x: 0, y: 500 },
		data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] },
	},
	{
		id: "oje1",
		type: "junction-or-end",
		position: { x: 300, y: 500 },
		data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] },
	},
	{
		id: "ajs1",
		type: "junction-and-start",
		position: { x: 0, y: 600 },
		data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] },
	},
	{
		id: "aje1",
		type: "junction-and-end",
		position: { x: 300, y: 600 },
		data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] },
	},
];

export const testEdges = [
	{
		id: "n1-t1",
		source: "n1",
		sourceHandle: "to-transition",
		target: "t1",
		type: "straight",
	},
	{
		id: "t1-n2",
		source: "t1",
		targetHandle: "from-transition",
		target: "n2",
		type: "straight",
	},
];
