'use client'
import React, { useCallback, useEffect, useRef, useState, type FC } from 'react';
import { Dimensions, Handle, Node, NodeProps, NodeResizer, Position, useReactFlow } from "@xyflow/react";
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';
import { FLOW_GRID_CELL_WIDTH } from '@/constants';
import { JUNCTION_NODE_BRANCH_ADD_BUTTON_WIDTH } from './JunctionNodeBranchAddButton';
import { useGrafcetContext } from '../../GrafcetContext';
import useSelectedBars from './useSelectedBars';
import useBranchAddButtonsPositions from './useBranchAddButtonsPositions';
import useBranchActions from './useBranchActions';
import useBranchesPositionsAdapter from './useBranchesPositionsAdapter';
import useBarMoveHandler from './useBarMoveHandler';

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

const JunctionNode: FC<JunctionNodeProps> = ({id, positionAbsoluteX, data, selected, width: nodeWidth, orientation, className, children}) =>{
	const th = useTheme()
	const {updateNodeData} = useReactFlow()
	const nodeHTMLElement = useRef<HTMLDivElement>(null)
	const borderColor = selected ? th.palette.primary.main : "black"
	const branchAddButtonsPositions = useBranchAddButtonsPositions(data)
	const [pivotSelected,  selectedBranchIndex] = useSelectedBars(id)
	const {add: onBranchAdd} = useBranchActions(id, data)
	const handleKeyDown = useBarMoveHandler(id, pivotSelected, selectedBranchIndex)

	useBranchesPositionsAdapter(id, nodeWidth, positionAbsoluteX)

	//Snap to grid
	useEffect(() => {
		if(data.width % FLOW_GRID_CELL_WIDTH !== 0) throw new Error("The width does not snap the grid")
	}, [data.width])

	useEffect(() => {
		if((pivotSelected || selectedBranchIndex != -1) && nodeHTMLElement.current) 
			nodeHTMLElement.current.focus()
	}, [pivotSelected, selectedBranchIndex])

	return <>
		<NodeResizer isVisible={selected} minWidth={JUNCTION_NODE_MIN_WIDTH}minHeight={JUNCTION_NODE_HEIGHT} maxHeight={JUNCTION_NODE_HEIGHT} />
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
		<Box 
			ref={nodeHTMLElement} 
			tabIndex={0}
			className={"grafcet-node junction-node "+className} 
			sx={{
				width: (nodeWidth != 0 ? nodeWidth : data.width)+"px", height: JUNCTION_NODE_HEIGHT+"px",
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
			}}
			onKeyDown={handleKeyDown}
		>
				{children({branchAddButtonsPositions, onBranchAdd, selectedBranchIndex, pivotSelected})}
		</Box>
	</>
}

export default JunctionNode