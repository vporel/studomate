import StepNode, { STEP_NODE_DEFAULT_DATA, STEP_NODE_DEFAULT_DIMENSIONS, StepNodeType } from './nodes/StepNode';
import ActionNode, { ACTION_NODE_DEFAULT_DATA, ACTION_NODE_DEFAULT_DIMENSIONS, ActionNodeType } from './nodes/ActionNode';
import AndJunctionEndNode, { AndJunctionEndNodeType } from './nodes/junctions/AndJunctionEndNode';
import SourceArrowNode, { SOURCE_ARROW_NODE_DEFAULT_DATA, SOURCE_ARROW_NODE_DEFAULT_DIMENSIONS, SourceArrowNodeType } from './nodes/SourceArrowNode';
import DestinationArrowNode, { DESTINATION_ARROW_NODE_DEFAULT_DATA, DESTINATION_ARROW_NODE_DEFAULT_DIMENSIONS, DestinationArrowNodeType } from './nodes/DestinationArrowNode';
import TransitionNode, { TRANSITION_NODE_DEFAULT_DATA, TRANSITION_NODE_DEFAULT_DIMENSIONS, TransitionNodeType } from './nodes/TransitionNode';
import AndJunctionStartNode, { AndJunctionStartNodeType } from './nodes/junctions/AndJunctionStartNode';
import OrJunctionStartNode, { OrJunctionStartNodeType } from './nodes/junctions/OrJunctionStartNode';
import OrJunctionEndNode, { OrJunctionEndNodeType } from './nodes/junctions/OrJunctionEndNode';
import { Connection, Dimensions, Node } from '@xyflow/react';
import { JUNCTION_NODE_DEFAULT_DATA, JUNCTION_NODE_DEFAULT_DIMENSIONS } from './nodes/junctions/JunctionNode';
import CustomEdge, { CustomEdgeType } from './edges/CustomEdge';

export type NodeTypeKey = "step"|"action"|"transition"|"source-arrow"|"destination-arrow"|"or-junction-start"|
  "or-junction-end"|"and-junction-start"|"and-junction-end"

export type JunctionNode = OrJunctionStartNodeType|OrJunctionEndNodeType|AndJunctionStartNodeType|AndJunctionEndNodeType
export type GrafcetNode = StepNodeType|ActionNodeType|TransitionNodeType|SourceArrowNodeType|DestinationArrowNodeType|JunctionNode //List of all the node types
export type GrafcetEdge = CustomEdgeType //List of all the edges types

export const nodesDefaultDimensions: Record<NodeTypeKey, Dimensions> = {
  "step": STEP_NODE_DEFAULT_DIMENSIONS,
  "action": ACTION_NODE_DEFAULT_DIMENSIONS,
  "transition": TRANSITION_NODE_DEFAULT_DIMENSIONS,
  "source-arrow": SOURCE_ARROW_NODE_DEFAULT_DIMENSIONS,
  "destination-arrow": DESTINATION_ARROW_NODE_DEFAULT_DIMENSIONS,
  "or-junction-start":JUNCTION_NODE_DEFAULT_DIMENSIONS,
  "or-junction-end": JUNCTION_NODE_DEFAULT_DIMENSIONS,
  "and-junction-start": JUNCTION_NODE_DEFAULT_DIMENSIONS,
  "and-junction-end": JUNCTION_NODE_DEFAULT_DIMENSIONS,
}

export const nodesDefaultData: Record<NodeTypeKey, any> = {
  "step": STEP_NODE_DEFAULT_DATA,
  "action": ACTION_NODE_DEFAULT_DATA,
  "transition": TRANSITION_NODE_DEFAULT_DATA,
  "source-arrow": SOURCE_ARROW_NODE_DEFAULT_DATA,
  "destination-arrow": DESTINATION_ARROW_NODE_DEFAULT_DATA,
  "or-junction-start": JUNCTION_NODE_DEFAULT_DATA,
  "or-junction-end": JUNCTION_NODE_DEFAULT_DATA,
  "and-junction-start": JUNCTION_NODE_DEFAULT_DATA,
  "and-junction-end": JUNCTION_NODE_DEFAULT_DATA,
}

export const nodeTypes: Record<NodeTypeKey, any> = {
  "step": StepNode,
  "action": ActionNode,
  "transition": TransitionNode,
  "source-arrow": SourceArrowNode,
  "destination-arrow": DestinationArrowNode,
  "or-junction-start": OrJunctionStartNode,
  "or-junction-end": OrJunctionEndNode,
  "and-junction-start": AndJunctionStartNode,
  "and-junction-end": AndJunctionEndNode,
}

export const edgeTypes = {
  "custom-edge": CustomEdge,
}

export function validateConnection(connection: Connection, nodes: Node[]): boolean{
  const sourceType = nodes.find(n => n.id == connection.source)!.type as NodeTypeKey
  const targetType = nodes.find(n => n.id == connection.target)!.type as NodeTypeKey

  if(sourceType == "step" && !["transition", "action", "or-junction-start", "and-junction-end"].includes(targetType)) return false
  if(sourceType == "transition" && !["step", "and-junction-start", "or-junction-end", "source-arrow"].includes(targetType)) return false
  if(sourceType == "or-junction-start" && !["transition"].includes(targetType)) return false
  if(sourceType == "or-junction-end" && !["step"].includes(targetType)) return false
  if(sourceType == "and-junction-start" && !["step"].includes(targetType)) return false
  if(sourceType == "and-junction-end" && !["transition"].includes(targetType)) return false
  if(sourceType == "destination-arrow" && !["step"].includes(targetType)) return false
  return true
}

export const testNodes = [
  { id: 'n1', type: 'step', position: { x: 10, y: 0 }, data: { number: 0, isInitial: true }},
  { id: 't1', type: 'transition', position: { x: 0, y: 60 }, data: { expression: "Transition" }},
  { id: 'n2', type: 'step', position: { x: 0, y: 110 }, data: { number: 1 }},
  { id: 'a1', type: 'action', position: { x: 100, y: 110 }, data: { expression: "Action", width: 100}},
  { id: 'n3', type: 'step', position: { x: 0, y: 200 }, data: { number: 2 }},
  { id: 'sa1', type: 'source-arrow', position: { x: 0, y: 300 }, data: { destinationStepNumber: 5 }},
  { id: 'da1', type: 'destination-arrow', position: { x: 0, y: 400 }, data: { sourceStepNumber: 5 }},
  { id: 'ojs1', type: 'or-junction-start', position: { x: 0, y: 500 }, data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] }},
  { id: 'oje1', type: 'or-junction-end', position: { x: 300, y: 500 }, data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] }},
  { id: 'ajs1', type: 'and-junction-start', position: { x: 0, y: 600 }, data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] }},
  { id: 'aje1', type: 'and-junction-end', position: { x: 300, y: 600 }, data: { width: 200, pivotPosition: 100, branchesPositions: [10, 190] }},
]

export const testEdges = [
  { id: 'n1-t1', source: 'n1', sourceHandle: "to-transition", target: 't1', type: 'straight'},
  { id: 't1-n2', source: 't1', targetHandle: "from-transition", target: 'n2', type: 'straight' }
]