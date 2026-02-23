"use client";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Action, {
	ACTION_EXECUTION_MODE_LABELS,
	ActionData,
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/Action.class";
import { Box, Typography, useTheme } from "@mui/material";
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
					borderWidth: data.type === ActionType.TEXT ? "1px" : "2px",
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

				{(data.executionMode === ActionExecutionMode.RISING_EDGE ||
					data.executionMode === ActionExecutionMode.FALLING_EDGE) && (
					<Box
						sx={{
							width: "1px",
							height: "15px",
							background: borderColor,
							position: "absolute",
							bottom: "100%",
							left: "15px",
							"&::before, &::after": {
								content: '""',
								position: "absolute",
								width: "1px",
								height: "8px",
								background: borderColor,
							},
							"&::before": {
								transform:
									data.executionMode === ActionExecutionMode.FALLING_EDGE
										? "rotate(-35deg)"
										: "rotate(35deg)",
								top: data.executionMode === ActionExecutionMode.FALLING_EDGE ? "7px" : "-1px",
								left: "-2px",
							},
							"&::after": {
								transform:
									data.executionMode === ActionExecutionMode.FALLING_EDGE
										? "rotate(35deg)"
										: "rotate(-35deg)",
								top: data.executionMode === ActionExecutionMode.FALLING_EDGE ? "7px" : "-1px",
								left: "2px",
							},
						}}
					/>
				)}
				{(data.executionMode === ActionExecutionMode.SET ||
					data.executionMode === ActionExecutionMode.RESET) && (
					<Box
						sx={{
							width: "20px",
							height: "20px",
							border: `1px solid ${borderColor}`,
							borderRadius: "4px",
							backgroundColor: "white",
							position: "absolute",
							top: "-15px",
							right: "5px",
							textAlign: "center",
						}}
					>
						<Typography fontSize="0.8rem">
							{ACTION_EXECUTION_MODE_LABELS[data.executionMode].substring(0, 1)}
						</Typography>
					</Box>
				)}
			</GrafcetNode>
		</>
	);
};

export default ActionNode;
