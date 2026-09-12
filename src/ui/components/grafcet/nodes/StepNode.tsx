"use client";
import Step, {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
	StepData,
} from "@/schemas/grafcet/step.schema";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import LockIcon from "@mui/icons-material/Lock";
import { SxProps, Theme, useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC, useMemo } from "react";

import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { usePageVisible } from "@/ui/components/pages/page-visibility-context";
import { useGrafcetStore } from "../context/GrafcetContext";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type StepNodeType = Node<StepData> & { type: "step" };

export type StepNodeProps = NodeProps<StepNodeType>;

const STEP_NODE_SX: SxProps<Theme> = {
	width: Step.DEFAULT_DIMENSIONS.width + "px",
	height: Step.DEFAULT_DIMENSIONS.height + "px",
	borderRadius: "5px",
	transition: "background .2s ease, borderColor .2s ease",
	display: "flex",
	justifyContent: "center",
	position: "relative",
};

const StepNode: FC<StepNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [
		editingNumber,
		setEditingNumber,
		editing,
		setEditing,
		saveNumber,
		error,
	] = useWithTextNodeValue(id, "step", data, "number", true);
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const pageVisible = usePageVisible();
	const stepVariableId = useMemo(
		() => getStepVariableId(grafcetId, data.number as number),
		[grafcetId, data.number],
	);
	const activeInSimulation = useProjectStore(
		(state) =>
			pageVisible &&
			state.simulationVariablesStates[stepVariableId]?.value === true,
	);
	const forcedValue = useProjectStore((state) =>
		pageVisible ? state.forcedVariables[stepVariableId] : undefined,
	);
	const isForced = forcedValue !== undefined;

	const nodeSx = useMemo<SxProps<Theme>>(
		() => ({
			...STEP_NODE_SX,
			borderWidth: data.initial ? "4px" : "1px",
			borderStyle: data.initial ? "double" : "solid",
			borderColor: isForced ? "warning.main" : borderColor,
			backgroundColor: activeInSimulation ? th.palette.primary.main : "white",
			color: activeInSimulation ? "white" : "black",
			"&:hover": {
				backgroundColor: activeInSimulation ? "primary.main" : "#efefef",
			},
		}),
		[data.initial, isForced, borderColor, activeInSimulation, th],
	);

	const inputStyle = useMemo<React.CSSProperties>(
		() => ({
			width: "100%",
			height: "100%",
			textAlign: "center",
			border: "none",
			outline: "none",
			borderRadius: "5px",
			backgroundColor: activeInSimulation ? th.palette.primary.main : "white",
			color: activeInSimulation ? "white" : "black",
			padding: 0,
			pointerEvents: !editing ? "none" : "all",
		}),
		[activeInSimulation, editing, th],
	);

	return (
		<>
			<HandleWithConnectionsLimit
				limit={10}
				id={STEP_HANDLE_TARGET_PREDECESSOR}
				type="target"
				position={Position.Top}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<HandleWithConnectionsLimit
				limit={1}
				id={STEP_HANDLE_SOURCE_SUCCESSOR}
				type="source"
				position={Position.Bottom}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<HandleWithConnectionsLimit
				limit={4}
				id={STEP_HANDLE_SOURCE_ACTION}
				type="source"
				position={Position.Right}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type="step"
				error={error}
				sx={nodeSx}
				onDoubleClick={() => {
					setEditing(true);
					inputRef.current?.focus();
				}}
			>
				{isForced && (
					<LockIcon
						sx={{
							position: "absolute",
							top: 1,
							right: 2,
							fontSize: "10px",
							color: activeInSimulation ? "white" : "warning.main",
							pointerEvents: "none",
						}}
					/>
				)}
				<input
					ref={inputRef}
					className="node__input step_node__input nodrag"
					type="text" //The values are restricted to numbers via the keydown event (because the type='number' causes issues when exporting the nodes to image)
					value={editingNumber}
					onChange={(e) => setEditingNumber(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === "Escape") {
							//The save is done only on blur to avoid multiple saves when pressing enter
							inputRef.current?.blur();
						} else {
							if (e.key.length === 1 && !/^\d$/.test(e.key)) e.preventDefault();
						}
					}}
					onBlur={() => {
						setEditing(false);
						saveNumber();
					}}
					style={inputStyle}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepNode;
