'use client'
import React, { type FC } from 'react';
import { Dimensions, Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';
import { range } from '@/lib/array';

export const SOURCE_ARROW_NODE_DEFAULT_DIMENSIONS: Dimensions = {width: 40, height: 40}

export type SourceArrowNodeData = {
	destinationStepNumber: number|"",
}

export const SOURCE_ARROW_NODE_DEFAULT_DATA: SourceArrowNodeData = {
	destinationStepNumber: ""
}

export type SourceArrowNodeType = Node<SourceArrowNodeData> & {type: "source-arrow"}

export type SourceArrowNodeProps = NodeProps<SourceArrowNodeType>

const SourceArrowNode: FC<SourceArrowNodeProps> = ({id, data, selected}) =>{
	const th = useTheme()
	const {updateNodeData} = useReactFlow()
	const inputRef = React.useRef<HTMLInputElement>(null)
	const [editing, setEditing] = React.useState(false)
	const borderColor = selected ? th.palette.primary.main : "black"

	return <>
		<HandleWithConnectionsLimit
			limit={1}
			id="from-step"
			type="target"
			position={Position.Top}
			style={{borderColor: borderColor, backgroundColor: borderColor}}
		/>
		<Box className="grafcet-node source-arrow-node" sx={{
			width: SOURCE_ARROW_NODE_DEFAULT_DIMENSIONS.width+"px", display: "flex", flexDirection: "column", alignItems: "center",
			gap: "5px"
		}} onDoubleClick={() => {setEditing(true); inputRef.current?.focus()}}>
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
					top: "11px", left: "-4px",
				},
				"&::after": {
					transform: "rotate(45deg)",
					top: "11px", left: "4px",
				}

			}}></Box>
			<input 
				ref={inputRef}
				className="node__input"
				type="text" //The values are restricted to numbers via the keydown event (because the type='number' causes issues when exporting the nodes to image)
				value={data.destinationStepNumber} 
				onKeyDown={e => {
					if(e.key.length == 1 && !range(0, 10).includes(parseInt(e.key))) e.preventDefault()
				}}
				onChange={e => updateNodeData(id, 
					{
						...data, 
						destinationStepNumber: (e.target.value == "" || parseInt(e.target.value) < 0) ? "" : parseInt(e.target.value)
					}
				)} 
				style={{
					width: "100%", textAlign:"center", border: "none", outline: "none",
					pointerEvents: !editing ? "none" : "all"
				}}
				onBlur={() => setEditing(false)}
			/>
		</Box>
	</>
}

export default SourceArrowNode