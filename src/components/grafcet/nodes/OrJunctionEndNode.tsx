'use client'
import React, { type FC } from 'react';
import { NodeProps } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import JunctionNode, { JunctionNodeType } from './JunctionNode';
import JunctionNodeAddBranchButton from './JunctionNodeAddBranchButton';

export type OrJunctionEndNodeType = JunctionNodeType & {type: "or-junction-end"}

export type OrJunctionEndNodeProps = NodeProps<OrJunctionEndNodeType>

const OrJunctionEndNode: FC<OrJunctionEndNodeProps> = (props) =>{
	const {data, selected} = props
	const th = useTheme()
	const borderColor = selected ? th.palette.primary.main : "black"

	return <JunctionNode orientation="end" className="or-junction-end-node" {...props}>
		{(addBranchButtonsPositions, onAddBranch, handleBranchPointerDown, handleBranchPointerMove, handleBranchPointerUp) => <>
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
			<Box sx={{width: "100%", height: "1px", background: borderColor}} />
			<Box sx={{marginLeft: (data.pivotPosition)+"px", width: "1px", height: "13px", background: borderColor}} />
			{/* Add branch buttons */}
			{addBranchButtonsPositions.map((pos, index) => <JunctionNodeAddBranchButton 
				key={index} 
				index={index} 
				position={{top: -10, left: pos}}
				onClick={onAddBranch}
			/>)}
		</>}
	</JunctionNode>
}

export default OrJunctionEndNode