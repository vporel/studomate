"use client";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Action, { ActionData } from "@/schemas/grafcet/Action.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import React, { type FC } from "react";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type ActionNodeType = Node<ActionData> & { type: "action" };

export type ActionNodeProps = NodeProps<ActionNodeType>;

const ActionNode: FC<ActionNodeProps> = ({ id, data, selected, width: nodeWidth, height: nodeHeight }) => {
	const th = useTheme();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [editingExpression, setEditingExpression, editing, setEditing, saveExpression, error] =
		useWithTextNodeValue(id, data, "expression", false);

	return (
		<>
			<NodeResizer
				isVisible={selected}
				minWidth={Action.DEFAULT_DIMENSIONS.width}
				minHeight={Action.DEFAULT_DIMENSIONS.height}
				maxWidth={Action.DEFAULT_DIMENSIONS.width * 3}
				maxHeight={Action.DEFAULT_DIMENSIONS.height * 2}
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
			<GrafcetNode
				type="action"
				id={id}
				error={error}
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
					value={editingExpression}
					onChange={(e) => setEditingExpression(e.target.value)}
					rows={1}
					onKeyDown={(e) => {
						if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
							//The save is done only on blur to avoid multiple saves when pressing enter
							textareaRef.current?.blur();
						}
					}}
					onBlur={() => {
						setEditing(false);
						saveExpression();
					}}
					style={{
						width: "100%",
						height: "100%",
						border: "none",
						outline: "none",
						resize: "none",
						boxSizing: "border-box",
						overflow: "hidden",
						padding: "0",
						lineHeight: "1.1rem",
						pointerEvents: !editing ? "none" : "all",
						fontSize: "0.8rem",
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default ActionNode;
