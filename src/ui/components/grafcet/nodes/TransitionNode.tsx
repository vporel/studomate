"use client";
import Transition, {
	TRANSITION_HANDLE_SOURCE_SUCCESSOR,
	TRANSITION_HANDLE_TARGET_PREDECESSOR,
	TransitionData,
} from "@/schemas/grafcet/transition.schema";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";

import { useProjectStore } from "../../projects/ProjectContext";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type TransitionNodeType = Node<TransitionData> & {
	type: "transition";
};

export type TransitionNodeProps = NodeProps<TransitionNodeType>;

const COLOR_IF_TRUE_IN_SIMULATOR = "darkorange";

const TransitionNode: FC<TransitionNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const [editingExpression, setEditingExpression, editing, setEditing, saveExpression, error] =
		useWithTextNodeValue(id, "transition", data, "expression", false);
	const trueInSimulator = useProjectStore(
		(state) => state.simulationManager.getEvaluableExpressionValue(id) === true,
	);
	const borderColor = trueInSimulator
		? COLOR_IF_TRUE_IN_SIMULATOR
		: selected
			? th.palette.primary.main
			: "black";

	return (
		<>
			<HandleWithConnectionsLimit
				limit={1}
				id={TRANSITION_HANDLE_TARGET_PREDECESSOR}
				type="target"
				position={Position.Top}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<HandleWithConnectionsLimit
				limit={1}
				id={TRANSITION_HANDLE_SOURCE_SUCCESSOR}
				type="source"
				position={Position.Bottom}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type="transition"
				error={error}
				sx={{
					position: "relative",
					width: Transition.DEFAULT_DIMENSIONS.width + "px",
					height: Transition.DEFAULT_DIMENSIONS.height + "px",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
				onDoubleClick={() => {
					setEditing(true);
					textareaRef.current?.focus();
				}}
			>
				<Box
					sx={{
						width: "1px",
						marginLeft: "-0.5px",
						height: "100%",
						background: borderColor,
						position: "relative",
						"&::before": {
							content: '""',
							position: "absolute",
							width: "25px",
							height: "2px",
							background: borderColor,
							top: "50%",
							left: "-12.5px",
						},
					}}
				></Box>
				<textarea
					ref={textareaRef}
					className="node__input transition_node__textarea nodrag"
					value={editingExpression}
					onChange={(e) => setEditingExpression(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === "Escape") {
							//The save is done only on blur to avoid multiple saves when pressing enter
							textareaRef.current?.blur();
						}
					}}
					onBlur={(e) => {
						setEditing(false);
						saveExpression();
					}}
					rows={1}
					style={{
						position: "absolute",
						left: "100%",
						width: "300px",
						border: "none",
						outline: "none",
						resize: "none",
						boxSizing: "border-box",
						overflow: "hidden",
						padding: "0",
						lineHeight: "1.2rem",
						pointerEvents: !editing ? "none" : "all",
						color: trueInSimulator ? COLOR_IF_TRUE_IN_SIMULATOR : "black",
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default TransitionNode;
