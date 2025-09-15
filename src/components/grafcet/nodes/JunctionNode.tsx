'use client'
import React, { useCallback, useEffect, useState, type FC } from 'react';
import { Dimensions, Handle, Node, NodeProps, NodeResizer, Position, useReactFlow } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';
import { FLOW_GRID_CELL_WIDTH } from '@/constants';
import { JUNCTION_NODE_ADD_BRANCH_BUTTON_WIDTH } from './JunctionNodeAddBranchButton';

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
	children: (
		addBranchButtonsPositions: number[], //In pixels from the left of the node
		onAddBranch: (buttonIndex: number) => void,
		handleBranchPointerDown: (e: React.PointerEvent<HTMLDivElement>, branchIndex: number) => void,
		handleBranchPointerMove: (e: React.PointerEvent<HTMLDivElement>, branchIndex: number) => void,
		handleBranchPointerUp: (e: React.PointerEvent<HTMLDivElement>, branchIndex: number) => void,
	) => React.ReactNode
}

const JunctionNode: FC<JunctionNodeProps> = ({id, positionAbsoluteX, data, selected, width: reactFlowNodeWidth, orientation, className, children}) =>{
	const th = useTheme()
	const {updateNodeData} = useReactFlow()
	const oldWidth = React.useRef(reactFlowNodeWidth)
	const oldPositionAbsoluteX = React.useRef(positionAbsoluteX)
	const borderColor = selected ? th.palette.primary.main : "black"
	const [addBranchButtonsPositions, setAddBranchButtonsPositions] = useState<number[]>([])

	const onAddBranch = useCallback((buttonIndex: number) => {
		let newBranchPosition = 0
		if(data.branchesPositions.length == 0) newBranchPosition = data.width/2
		else{
			if(buttonIndex == 0) newBranchPosition = data.branchesPositions[0]/2
			else if(buttonIndex == data.branchesPositions.length) newBranchPosition = (data.branchesPositions[data.branchesPositions.length-1] + data.width)/2
			else{
				newBranchPosition = (data.branchesPositions[buttonIndex-1] + data.branchesPositions[buttonIndex])/2
			}
		}
		if(newBranchPosition % FLOW_GRID_CELL_WIDTH != 0) newBranchPosition = newBranchPosition - (newBranchPosition % FLOW_GRID_CELL_WIDTH)
		const newBranchesPositions = [...data.branchesPositions]
		newBranchesPositions.splice(buttonIndex, 0, newBranchPosition)
		updateNodeData(id, {branchesPositions: newBranchesPositions})
	}, [data.width, data.branchesPositions])

	const handleBranchPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>, branchIndex: number) => {
		(e.target as HTMLDivElement).setPointerCapture(e.pointerId)
	}, [])

	const handleBranchPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>, branchIndex: number) => {
		if(e.buttons !== 1) return;
	}, [])
	
	const handleBranchPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>, branchIndex: number) => {
		(e.target as HTMLDivElement).releasePointerCapture(e.pointerId)
	}, [])

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

	//Calculate the positions for the add branch buttons
	useEffect(() => {
		if(data.branchesPositions.length == 0){
			setAddBranchButtonsPositions([data.width/2])
			return
		}
		const buttonsPositions = []
		if(data.branchesPositions[0] <= JUNCTION_NODE_ADD_BRANCH_BUTTON_WIDTH/2) buttonsPositions.push(-JUNCTION_NODE_ADD_BRANCH_BUTTON_WIDTH/2)
		else buttonsPositions.push(data.branchesPositions[0])
		for(let i = 1; i < data.branchesPositions.length; i++){
			buttonsPositions.push((data.branchesPositions[i-1] + data.branchesPositions[i])/2)
		}
		if((data.width - data.branchesPositions[data.branchesPositions.length-1]) <= JUNCTION_NODE_ADD_BRANCH_BUTTON_WIDTH/2) buttonsPositions.push(data.width+(JUNCTION_NODE_ADD_BRANCH_BUTTON_WIDTH/2))
		else buttonsPositions.push((data.branchesPositions[data.branchesPositions.length-1] + data.width)/2)
		setAddBranchButtonsPositions(buttonsPositions)
	}, [data.width, data.branchesPositions])

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
			".junction-node__add-branch-button": {
				visibility: "hidden",
				opacity: 0,
			},
			"&:hover":{
				".junction-node__add-branch-button": {
					visibility: "visible",
					opacity: 1
				}
			}
		}}>
			{children(addBranchButtonsPositions, onAddBranch, handleBranchPointerDown, handleBranchPointerMove, handleBranchPointerUp)}
		</Box>
	</>
}

export default JunctionNode