"use client";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Action, { ActionData } from "@/schemas/grafcet/Action.class";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position, useReactFlow } from "@xyflow/react";
import React, { useEffect, type FC } from "react";

export type ActionNodeType = Node<ActionData> & { type: "action" };

export type ActionNodeProps = NodeProps<ActionNodeType>;

const ActionNode: FC<ActionNodeProps> = ({ id, data, selected, width: nodeWidth, height: nodeHeight }) => {
	const th = useTheme();
	const { updateNodeData } = useReactFlow();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const [editing, setEditing] = React.useState(false);
	const borderColor = selected ? th.palette.primary.main : "black";

	const onExpressionChange = React.useCallback(
		(newExpression: string) => {
			updateNodeData(id, { ...data, expression: newExpression });
		},
		[id, data, updateNodeData]
	);

	//Update the width branches positions when the node is resized
	useEffect(() => {
		updateNodeData(id, (n) => {
			const dataToChange: Partial<ActionData> = {};
			if (nodeWidth != 0) dataToChange.width = nodeWidth;
			if (nodeHeight != 0) dataToChange.height = nodeHeight;
			return dataToChange;
		});
	}, [id, nodeWidth, nodeHeight, updateNodeData]);

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={Action.defaultDimensions.width}
				minHeight={Action.defaultDimensions.height}
				maxHeight={Action.defaultDimensions.height * 2}
			/>
			<HandleWithConnectionsLimit
				limit={1}
				id="from-step"
				type="target"
				position={Position.Left}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<Box
				className="grafcet-node action-node"
				sx={{
					width: (nodeWidth != 0 ? nodeWidth : data.width) + "px",
					height: (nodeHeight != 0 ? nodeHeight : data.height) + "px",
					borderWidth: "1px",
					borderStyle: "solid",
					borderColor: borderColor,
					borderRadius: "5px",
					backgroundColor: "white",
					padding: "5px",
					display: "flex",
					alignItems: "center",
					transition: "background .2s ease, borderColor .2s ease",
					"&:hover": {
						background: "#efefef",
					},
				}}
				onDoubleClick={() => {
					setEditing(true);
					textareaRef.current?.focus();
				}}
			>
				<textarea
					ref={textareaRef}
					className="node__input action_node__textarea"
					value={data?.expression}
					onChange={(e) => onExpressionChange(e.target.value)}
					rows={1}
					style={{
						width: "100%",
						border: "none",
						outline: "none",
						resize: "none",
						boxSizing: "border-box",
						overflow: "hidden",
						padding: "0",
						lineHeight: "1.2rem",
						pointerEvents: !editing ? "none" : "all",
					}}
					onBlur={() => setEditing(false)}
				/>
			</Box>
		</>
	);
};

export default ActionNode;
