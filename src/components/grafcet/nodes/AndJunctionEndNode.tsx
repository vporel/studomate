'use client'
import React, { type FC } from 'react';
import { NodeProps } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';
import JunctionNodeBranchAddButton from './JunctionNodeBranchAddButton';
import JunctionNodeVerticalBar from './JunctionNodeVerticalBar';

export type AndJunctionEndNodeType = JunctionNodeType & {type: "and-junction-end"}

export type AndJunctionEndNodeProps = NodeProps<AndJunctionEndNodeType>

const AndJunctionEndNode: FC<AndJunctionEndNodeProps> = (props) =>{
	const {data, selected, width: nodeWidth} = props
	const th = useTheme()
	const borderColor = selected ? th.palette.primary.main : "black"

	return <JunctionNode orientation="end" className="and-junction-end-node" {...props}>
		{({branchAddButtonsPositions, onBranchAdd, onMoveBranch, onMovePivot}) => <>
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
			<Box sx={{width: "100%", height: "1px", background: borderColor}} />
			<Box sx={{width: "100%", height: "1px", background: borderColor, marginTop: "3px"}} />
			<JunctionNodeVerticalBar pivot color={borderColor} left={data.pivotPosition} nodeWidth={nodeWidth} height="12px" onMove={onMovePivot}/>
			<Box sx={{marginLeft: data.pivotPosition+"px", width: "1px", height: "12px", background: borderColor}} />
			{/* Add branch buttons */}
			{branchAddButtonsPositions.map((pos, index) => <JunctionNodeBranchAddButton 
				key={index} 
				index={index} 
				position={{top: -10, left: pos}}
				onClick={onBranchAdd}
			/>)}
		</>}
	</JunctionNode>
}

export default AndJunctionEndNode