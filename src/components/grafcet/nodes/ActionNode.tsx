"use client";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Action, { ActionData } from "@/schemas/grafcet/Action.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position, useReactFlow } from "@xyflow/react";
import React, { useCallback, useEffect, type FC } from "react";
import { useGrafcetContext } from "../context/GrafcetContext";
import GrafcetNode from "./GrafcetNode";
import { nodeStateEventsIn } from "./nodes-states-events";

export type ActionNodeType = Node<ActionData> & { type: "action" };

export type ActionNodeProps = NodeProps<ActionNodeType>;

const ActionNode: FC<ActionNodeProps> = ({ id, data, selected, width: nodeWidth, height: nodeHeight }) => {
	const th = useTheme();
	const { updateNodeData } = useReactFlow();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const [editing, setEditing] = React.useState(false);
	const [editingExpression, setEditingExpression] = React.useState(data.expression);
	const borderColor = selected ? th.palette.primary.main : "black";
	const { elementsEvents } = useGrafcetContext();

	const saveExpression = useCallback(() => {
		updateNodeData(id, {
			expression: editingExpression,
		});
		elementsEvents.emit("update", {
			elements: [{ id, type: "action", data: { expression: editingExpression } }],
		});
	}, [editingExpression, updateNodeData, id, elementsEvents]);

	// //Update the data when the node is resized
	// useEffect(() => {
	// 	updateNodeData(id, () => {
	// 		const dataToChange: Partial<ActionData> = {};
	// 		if (nodeWidth != 0) dataToChange.width = nodeWidth;
	// 		if (nodeHeight != 0) dataToChange.height = nodeHeight;
	// 		if (Object.keys(dataToChange).length !== 0) {
	// 			elementsEvents.emit("update", {
	// 				elements: [{ id, type: "action", data: dataToChange }],
	// 			});
	// 		}
	// 		return dataToChange;
	// 	});
	// }, [id, nodeWidth, nodeHeight, updateNodeData, elementsEvents]);

	//Listen the set-data event from the commands handlers to update the internal state
	useEffect(() => {
		const handler = (e: { nodeId: string; data: Partial<ActionData> }) => {
			if (e.nodeId === id) {
				if (e.data.expression !== undefined) setEditingExpression(e.data.expression);
			}
		};

		nodeStateEventsIn.on("set-internal-data", handler);
		return () => {
			nodeStateEventsIn.off("set-internal-data", handler);
		};
	}, [id]);

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
			<GrafcetNode
				type="action"
				id={id}
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
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default ActionNode;
