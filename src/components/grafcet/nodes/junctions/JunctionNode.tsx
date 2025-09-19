'use client'
import React, { useCallback, useEffect, useState, type FC } from 'react';
import { Dimensions, Handle, Node, NodeProps, NodeResizer, Position, useReactFlow } from "@xyflow/react";
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';
import { FLOW_GRID_CELL_WIDTH } from '@/constants';
import { JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH } from './JunctionNodeBranchAddButton';
import { useGrafcetPageContext } from '../../GrafcetPageContext';
import useJunctionSelectedBars from './useJunctionSelectedBars';
import useBranchAddButtonsPositions from './useBranchAddButtonsPositions';
import useBranchActions from './useBranchActions';

export const JUNCTION_NODE_MIN_WIDTH = 200
export const JUNCTION_NODE_HEIGHT = 30

export const JUNCTION_NODE_DEFAULT_DIMENSIONS: Dimensions = {
	width: JUNCTION_NODE_MIN_WIDTH, 
	height: JUNCTION_NODE_HEIGHT
}

export type JunctionNodeData = {
	width: number,
	pivotPosition: number,
	branchesPositions: number[], //In pixels from the left of the node
}

export const JUNCTION_NODE_DEFAULT_DATA: JunctionNodeData = {
	width: JUNCTION_NODE_DEFAULT_DIMENSIONS.width,
	pivotPosition: JUNCTION_NODE_DEFAULT_DIMENSIONS.width/2,
	branchesPositions: [10, 190]
}

export type JunctionNodeType = Node<JunctionNodeData>

export type JunctionNodeProps = NodeProps<JunctionNodeType> & {
	orientation: "start"|"end", 
	className?: string, 
	children: (props: {
		branchAddButtonsPositions: number[], //In pixels from the left of the node
		onBranchAdd: (buttonIndex: number) => void,
		selectedBranchIndex: number, //-1 if no one
		pivotSelected: boolean,
	}) => React.ReactNode
}

const JunctionNode: FC<JunctionNodeProps> = ({id, positionAbsoluteX, data, selected, width: reactFlowNodeWidth, orientation, className, children}) =>{
	const th = useTheme()
	const {updateNodeData} = useReactFlow()
	const oldWidth = React.useRef(reactFlowNodeWidth)
	const oldPositionAbsoluteX = React.useRef(positionAbsoluteX)
	const borderColor = selected ? th.palette.primary.main : "black"
	const branchAddButtonsPositions = useBranchAddButtonsPositions(data)
	const [pivotSelected,  selectedBranchIndex] = useJunctionSelectedBars(id)
	const {add: onBranchAdd} = useBranchActions(id, data)

	//Snap to grid
	useEffect(() => {
		if(data.width % FLOW_GRID_CELL_WIDTH !== 0) throw new Error("The width does not snap the grid")
	}, [data.width])

	//Update de branches positions when the node is resized
	useEffect(() => {
		if(reactFlowNodeWidth != oldWidth.current){
			updateNodeData(id, n => {
				const node = n as JunctionNodeType
				const dataToChange: Partial<JunctionNodeData> = {}
				if(reactFlowNodeWidth != 0) dataToChange.width = reactFlowNodeWidth
				if(positionAbsoluteX != oldPositionAbsoluteX.current){
					const positionDelta = oldPositionAbsoluteX.current - positionAbsoluteX
					dataToChange.pivotPosition = node.data.pivotPosition + positionDelta
					dataToChange.branchesPositions = node.data.branchesPositions.map(p => p + positionDelta)
					oldPositionAbsoluteX.current = positionAbsoluteX
				}
				return dataToChange
			})
			oldWidth.current = reactFlowNodeWidth
		}
	}, [id, reactFlowNodeWidth, positionAbsoluteX])

	return <>
		<NodeResizer 
			isVisible={selected} 
			minWidth={JUNCTION_NODE_MIN_WIDTH}
			minHeight={JUNCTION_NODE_HEIGHT}
			maxHeight={JUNCTION_NODE_HEIGHT}
		/>
		{data.branchesPositions.map((pos, index) => <HandleWithConnectionsLimit
			key={index}
			limit={1}
			id={"branch-"+(index+1)}
			type={orientation == "start" ? "source" : "target"}
			position={orientation == "start" ? Position.Bottom : Position.Top}
			style={{left: pos+"px", borderColor: borderColor, backgroundColor: borderColor}}
		/>)}
		<HandleWithConnectionsLimit
			limit={1}
			id="pivot"
			type={orientation == "start" ? "target" : "source"}
			position={orientation == "start" ? Position.Top : Position.Bottom}
			style={{left: (data.pivotPosition)+"px", borderColor: borderColor, backgroundColor: borderColor}}
		/>
		<Box className={"grafcet-node junction-node "+className} sx={{
			width: (reactFlowNodeWidth != 0 ? reactFlowNodeWidth : data.width)+"px", height: JUNCTION_NODE_HEIGHT+"px",
			display: "flex", flexDirection: "column", position: "relative",
			".junction-node__branch__add-button": {
				visibility: "hidden",
				opacity: 0,
			},
			"&:hover":{
				".junction-node__branch__add-button": {
					visibility: "visible",
					opacity: 1
				}
			}
		}}>
			{children({branchAddButtonsPositions, onBranchAdd, selectedBranchIndex, pivotSelected})}
		</Box>
	</>
}

export default JunctionNode