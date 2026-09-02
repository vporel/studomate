"use client";
import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import Action, {
	ACTION_HANDLE_TARGET_STEP,
	ActionData,
	ActionExecutionMode,
	ActionType,
} from "@/schemas/grafcet/action.schema";
import ActionHelper from "@/schemas/grafcet/helpers/action.helper";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { Box, Typography, useTheme } from "@mui/material";
import { Node, NodeProps, NodeResizer, Position } from "@xyflow/react";
import React, { type FC } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import { useT } from "@/ui/i18n/useT";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type ActionNodeType = Node<ActionData> & { type: "action" };

export type ActionNodeProps = NodeProps<ActionNodeType>;

const ActionNode: FC<ActionNodeProps> = ({
	id,
	data,
	selected,
	width,
	height,
}) => {
	const th = useTheme();
	const tModes = useT("grafcetEditor.actionModes");
	const textareaRef = React.useRef<HTMLTextAreaElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [
		editingExpression,
		setEditingExpression,
		editing,
		setEditing,
		saveExpression,
		error,
	] = useWithTextNodeValue(id, "action", data, "expression", false);
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const pageVisible = usePageVisible();

	const activeInSimulation = useProjectStore((state) => {
		if (!pageVisible) return false;
		const grafcet = state.project!.grafcets[grafcetId];
		if (!grafcet) return false;
		const step = ActionHelper.getStep(id, grafcet);
		if (!step || step.data.number === "") return false;
		return (
			state.simulationVariablesStates[
				getStepVariableId(grafcetId, step.data.number)
			]?.value === true
		);
	});

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
				id={ACTION_HANDLE_TARGET_STEP}
				type="target"
				position={Position.Left}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type="action"
				error={error}
				sx={{
					width: (width ?? Action.DEFAULT_DIMENSIONS.width) + "px",
					height: (height ?? Action.DEFAULT_DIMENSIONS.height) + "px",
					borderWidth: data.type === ActionType.TEXT ? "1px" : "2px",
					borderStyle: "solid",
					borderColor: borderColor,
					borderRadius: "5px",
					padding: "5px",
					display: "flex",
					alignItems: "center",
					transition: "background .2s ease, borderColor .2s ease",
					backgroundColor: activeInSimulation
						? th.palette.primary.main
						: "white",
					color: activeInSimulation ? "white" : "black",
					"&:hover": {
						backgroundColor: activeInSimulation ? "primary.main" : "#efefef",
					},
				}}
				onDoubleClick={() => {
					setEditing(true);
					textareaRef.current?.focus();
				}}
			>
				<textarea
					ref={textareaRef}
					className="node__input action_node__textarea nodrag"
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
						padding: "0",
						backgroundColor: activeInSimulation
							? th.palette.primary.main
							: "white",
						color: activeInSimulation ? "white" : "black",
						lineHeight: "1.1rem",
						pointerEvents: !editing ? "none" : "all",
						fontSize: "0.8rem",
						overflowY: "auto",
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
								top:
									data.executionMode === ActionExecutionMode.FALLING_EDGE
										? "7px"
										: "-1px",
								left: "-2px",
							},
							"&::after": {
								transform:
									data.executionMode === ActionExecutionMode.FALLING_EDGE
										? "rotate(35deg)"
										: "rotate(-35deg)",
								top:
									data.executionMode === ActionExecutionMode.FALLING_EDGE
										? "7px"
										: "-1px",
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
							color: "black",
						}}
					>
						<Typography fontSize="0.8rem">
							{tModes(data.executionMode).substring(0, 1)}
						</Typography>
					</Box>
				)}
			</GrafcetNode>
		</>
	);
};

export default ActionNode;
