'use client'
import React, { type FC } from 'react';
import { NodeProps } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';
import JunctionNodeAddBranchButton from './JunctionNodeAddBranchButton';

export type OrJunctionStartNodeType = JunctionNodeType & {type: "or-junction-start"}

export type OrJunctionStartNodeProps = NodeProps<OrJunctionStartNodeType>

const OrJunctionStartNode: FC<OrJunctionStartNodeProps> = (props) =>{
	const {data, selected} = props
	const th = useTheme()
	const borderColor = selected ? th.palette.primary.main : "black"

	return <JunctionNode orientation="start" className="or-junction-start-node" {...props}>
		{(addBranchButtonsPositions, onAddBranch, handleBranchPointerDown, handleBranchPointerMove, handleBranchPointerUp) => <>
			<Box sx={{marginLeft: data.pivotPosition+"px", width: "1px", height: "13px", background: borderColor}} />
			<Box sx={{width: "100%", height: "1px", background: borderColor}} />
			<Box sx={{width: "100%", height: "13px", position: "relative"}}>
				{data.branchesPositions.map((pos, index) => <Box
					key={index}
					component="div"
					sx={{
						width: "1px", height: "100%", background: borderColor,
						position: "absolute", left: pos+"px",
						":hover": {
							background: "red"
						}
					}}
					onPointerDown={e => handleBranchPointerDown(e, index)}
					onPointerMove={e => handleBranchPointerMove(e, index)}
					onPointerUp={e => handleBranchPointerUp(e, index)}
				/>)}
			</Box>
			{/* Add branch buttons */}
			{addBranchButtonsPositions.map((pos, index) => <JunctionNodeAddBranchButton 
				key={index} 
				index={index} 
				position={{top: 20, left: pos}}
				onClick={onAddBranch}
			/>)}
		</>}
	</JunctionNode>
}

export default OrJunctionStartNode