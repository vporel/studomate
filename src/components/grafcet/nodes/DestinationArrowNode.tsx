'use client'
import React, { type FC } from 'react';
import { Dimensions, Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';
import { range } from '@/lib/array';

export const DESTINATION_ARROW_NODE_DEFAULT_DIMENSIONS: Dimensions = {width: 40, height: 40}

export type DestinationArrowNodeData = {
	sourceStepNumber: number|"",
}

export const DESTINATION_ARROW_NODE_DEFAULT_DATA: DestinationArrowNodeData = {
	sourceStepNumber: ""
}

export type DestinationArrowNodeType = Node<DestinationArrowNodeData> & {type: "destination-arrow"}

export type DestinationArrowNodeProps = NodeProps<DestinationArrowNodeType>

const DestinationArrowNode: FC<DestinationArrowNodeProps> = ({id, data, selected}) =>{
	const th = useTheme()
	const {updateNodeData} = useReactFlow()
	const inputRef = React.useRef<HTMLInputElement>(null)
	const [editing, setEditing] = React.useState(false)
	const borderColor = selected ? th.palette.primary.main : "black"

	return <>
		<HandleWithConnectionsLimit
			limit={1}
			id="to-step"
			type="source"
			position={Position.Bottom}
			style={{borderColor: borderColor, backgroundColor: borderColor}}
		/>
		<Box className="grafcet-node destination-arrow-node" sx={{
			width: DESTINATION_ARROW_NODE_DEFAULT_DIMENSIONS.width+"px", display: "flex", flexDirection: "column", alignItems: "center",
			gap: "5px"
		}} onDoubleClick={() => {setEditing(true); inputRef.current?.focus()}}>
			<input 
				ref={inputRef}
				className="node__input"
				type="text" //The values are restricted to numbers via the keydown event (because the type='number' causes issues when exporting the nodes to image)
				value={data.sourceStepNumber} 
				onKeyDown={e => {
					if(e.key.length == 1 && !range(0, 10).includes(parseInt(e.key))) e.preventDefault()
				}}
				onChange={e => updateNodeData(id, 
					{
						...data, 
						sourceStepNumber: (e.target.value == "" || parseInt(e.target.value) < 0) ? "" : parseInt(e.target.value)
					}
				)} 
				style={{
					width: "100%", textAlign:"center", border: "none", outline: "none",
					pointerEvents: !editing ? "none" : "all"
				}}
				onBlur={() => setEditing(false)}
			/>
			<Box sx={{
				width: "1px", height: "20px",
				background: borderColor, position: "relative",
				"&::before, &::after": {
					content: '""',
					position: "absolute",
					width: "1px", height: "10px",
					background: borderColor,
				},
				"&::before": {
					transform: "rotate(-45deg)",
					top: "-7px", left: "-4px",
				},
				"&::after": {
					transform: "rotate(45deg)",
					top: "-7px", left: "4px",
				}
			}}></Box>
		</Box>
	</>
}

export default DestinationArrowNode