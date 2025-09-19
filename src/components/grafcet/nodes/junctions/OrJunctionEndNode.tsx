'use client'
import React, { type FC } from 'react';
import { NodeProps } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';
import JunctionNodeVerticalBar from './JunctionNodeVerticalBar';
import JunctionNodeBranchAddButton from './JunctionNodeBranchAddButton';

export type OrJunctionEndNodeType = JunctionNodeType & {type: "or-junction-end"}

export type OrJunctionEndNodeProps = NodeProps<OrJunctionEndNodeType>

const OrJunctionEndNode: FC<OrJunctionEndNodeProps> = (props) =>{
	const {data, selected} = props
	const th = useTheme()
	const borderColor = selected ? th.palette.primary.main : "black"

	return <JunctionNode orientation="end" className="or-junction-end-node" {...props}>
		{({branchAddButtonsPositions, onBranchAdd, selectedBranchIndex, pivotSelected}) => <>
			<Box sx={{width: "100%", height: "13px", position: "relative"}}>
				{data.branchesPositions.map((pos, index) => <JunctionNodeVerticalBar
					key={index}
					color={borderColor}
					left={pos}
					selected={selectedBranchIndex == index}
				/>)}
			</Box>
			<Box sx={{width: "100%", height: "1px", background: borderColor}} />
			<Box sx={{width: "100%", height: "13px", position: "relative"}}>
				<JunctionNodeVerticalBar color={borderColor} left={data.pivotPosition} selected={pivotSelected}/>
			</Box>
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

export default OrJunctionEndNode