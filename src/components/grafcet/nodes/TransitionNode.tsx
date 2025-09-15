'use client'
import React, { type FC } from 'react';
import { Dimensions, Handle, Node, NodeProps, Position, useReactFlow } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';

export const TRANSITION_NODE_DEFAULT_DIMENSIONS: Dimensions = {width: 40, height: 30}

export type TransitionNodeData = {
	expression: string
}

export const TRANSITION_NODE_DEFAULT_DATA: TransitionNodeData = {
	expression: ""
}

export type TransitionNodeType = Node<TransitionNodeData> & {type: "transition"}

export type TransitionNodeProps = NodeProps<TransitionNodeType>

const TransitionNode: FC<TransitionNodeProps> = ({id, data, selected}) =>{
	const th = useTheme()
	const {updateNodeData} = useReactFlow()
	const textareaRef = React.useRef<HTMLTextAreaElement>(null)
	const [editing, setEditing] = React.useState(false)
	const borderColor = selected ? th.palette.primary.main : "black"

	const onExpressionChange = React.useCallback((newExpression: string) => {
		updateNodeData(id, {...data, expression: newExpression})
		
	}, [id, data, updateNodeData])

	return <>
		<HandleWithConnectionsLimit
			limit={1}
			id="from-step"
			type="target"
			position={Position.Top}
			style={{borderColor: borderColor, backgroundColor: borderColor}}
		/>
		<HandleWithConnectionsLimit
			limit={1}
			id="to-step"
			type="source"
			position={Position.Bottom}
			style={{borderColor: borderColor, backgroundColor: borderColor}}
		/>
		<Box className="grafcet-node transition-node" sx={{
			position: "relative",
			width: TRANSITION_NODE_DEFAULT_DIMENSIONS.width+"px", 
			height: TRANSITION_NODE_DEFAULT_DIMENSIONS.height+"px", 
			display: "flex", justifyContent: "center", alignItems: "center",
		}} onDoubleClick={() => {setEditing(true); textareaRef.current?.focus()}}>
			<Box sx={{
				width: "1px", height: "100%",
				background: borderColor, position: "relative",
				"&::before": {
					content: '""',
					position: "absolute",
					width: "25px", height: "2px",
					background: borderColor,
					top: "50%", left: "-12.5px",
				}
			}}></Box>
			<textarea 
				ref={textareaRef}
				className="action_node__textarea"
				value={data?.expression} 
				onChange={e => onExpressionChange(e.target.value)}
				rows={1}
				style={{
					position: "absolute",
					left: "100%",
					width: "300px", border: "none", outline: "none", resize: "none",
					boxSizing: "border-box", overflow: "hidden", padding: "0",
					lineHeight: "1.2rem",
					pointerEvents: !editing ? "none" : "all"
				}}
				onBlur={() => setEditing(false)}
			/>
		</Box>
	</>
}

export default TransitionNode