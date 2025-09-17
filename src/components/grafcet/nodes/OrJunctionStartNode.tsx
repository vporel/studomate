'use client'
import React, { type FC } from 'react';
import { NodeProps } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';
import JunctionNodeBranchAddButton from './JunctionNodeBranchAddButton';
import JunctionNodeVerticalBar from './JunctionNodeVerticalBar';

export type OrJunctionStartNodeType = JunctionNodeType & {type: "or-junction-start"}

export type OrJunctionStartNodeProps = NodeProps<OrJunctionStartNodeType>

const OrJunctionStartNode: FC<OrJunctionStartNodeProps> = (props) =>{
	const {data, selected, width: nodeWidth} = props
	const th = useTheme()
	const borderColor = selected ? th.palette.primary.main : "black"

	return <JunctionNode orientation="start" className="or-junction-start-node" {...props}>
		{(branchAddButtonsPositions, onBranchAdd, onMoveBranch, onMovePivot) => <>
			<JunctionNodeVerticalBar pivot color={borderColor} left={data.pivotPosition} nodeWidth={nodeWidth} height="13px" onMove={onMovePivot}/>
			<Box sx={{width: "100%", height: "1px", background: borderColor}} />
			<Box sx={{width: "100%", height: "13px", position: "relative"}}>
				{data.branchesPositions.map((pos, index) => <JunctionNodeVerticalBar
					key={index}
					color={borderColor}
					left={pos}
					nodeWidth={nodeWidth}
					height="100%"
					onMove={delta => onMoveBranch(index, delta)}
				/>)}
			</Box>
			{/* Add branch buttons */}
			{branchAddButtonsPositions.map((pos, index) => <JunctionNodeBranchAddButton 
				key={index} 
				index={index} 
				position={{top: 20, left: pos}}
				onClick={onBranchAdd}
			/>)}
		</>}
	</JunctionNode>
}

export default OrJunctionStartNode