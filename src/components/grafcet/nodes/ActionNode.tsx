'use client'
import React, { useEffect, type FC } from 'react';
import { Handle, Node, NodeProps, Position, useReactFlow, Dimensions, XYPosition, NodeResizer, ResizeDragEvent } from "@xyflow/react"
import { Box, useTheme } from '@mui/material';
import HandleWithConnectionsLimit from '@/lib/react-flow/HandleWithConnectionsLimit';
import { createElementId } from '@/schemas/schemas-helpers';

export const ACTION_NODE_DEFAULT_DIMENSIONS: Dimensions = {width: 100, height: 40}

export type ActionNodeData = {
	expression: string, width: number
}

export const ACTION_NODE_DEFAULT_DATA: ActionNodeData = {
	expression: "", width: ACTION_NODE_DEFAULT_DIMENSIONS.width
}

export type ActionNodeType = Node<ActionNodeData> & {type: "action"}

export type ActionNodeProps = NodeProps<ActionNodeType>

const ActionNode: FC<ActionNodeProps> = ({id, data, selected, width: reactFlowNodeWidth}) =>{
	const th = useTheme()
	const oldWidth = React.useRef(reactFlowNodeWidth)
	const {updateNodeData} = useReactFlow()
	const textareaRef = React.useRef<HTMLTextAreaElement>(null)
	const [width, setWidth] = React.useState(data.width ?? ACTION_NODE_DEFAULT_DIMENSIONS.width)
	const [editing, setEditing] = React.useState(false)
	const borderColor = selected ? th.palette.primary.main : "black"

	const onExpressionChange = React.useCallback((newExpression: string) => {
		updateNodeData(id, {...data, expression: newExpression})
		
	}, [id, data, updateNodeData])

	//Update the width branches positions when the node is resized
	useEffect(() => {
		if(reactFlowNodeWidth != oldWidth.current){
			updateNodeData(id, n => {
				const node = n as ActionNodeType
				const dataToChange: Partial<ActionNodeData> = {}
				if(reactFlowNodeWidth != 0) dataToChange.width = reactFlowNodeWidth
				return dataToChange
			})
			oldWidth.current = reactFlowNodeWidth
		}
	}, [id, reactFlowNodeWidth])

	return <>
		<NodeResizer 
			isVisible={selected} 
			minWidth={ACTION_NODE_DEFAULT_DIMENSIONS.width}
			minHeight={ACTION_NODE_DEFAULT_DIMENSIONS.height}
			maxHeight={ACTION_NODE_DEFAULT_DIMENSIONS.height}
		/>
		<HandleWithConnectionsLimit
			limit={1}
			id="from-step"
			type="target"
			position={Position.Left}
			style={{borderColor: borderColor, backgroundColor: borderColor}}
		/>
		<Box className="grafcet-node action-node" sx={{
			width: (reactFlowNodeWidth != 0 ? reactFlowNodeWidth : data.width)+"px", 
			height: ACTION_NODE_DEFAULT_DIMENSIONS.height+"px", 
			borderWidth: "1px", 
			borderStyle: "solid", 
			borderColor: borderColor,
			borderRadius: "5px", 
			backgroundColor: "white",
			padding: "5px",
			display: "flex", alignItems: "center",
			transition: "background .2s ease, borderColor .2s ease",
			"&:hover": {
				background: "#efefef"
			}
		}} onDoubleClick={() => {setEditing(true); textareaRef.current?.focus()}}>
			<textarea 
				ref={textareaRef}
				className="node__input action_node__textarea"
				value={data?.expression} 
				onChange={e => onExpressionChange(e.target.value)}
				rows={1}
				style={{
					width: "100%", border: "none", outline: "none", resize: "none",
					boxSizing: "border-box", overflow: "hidden", padding: "0",
					lineHeight: "1.2rem",
					pointerEvents: !editing ? "none" : "all",
				}}
				onBlur={() => setEditing(false)}
			/>
		</Box>
	</>
}

export default ActionNode