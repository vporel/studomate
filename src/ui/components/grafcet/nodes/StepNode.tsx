"use client";
import { range } from "@/lib/array";
import Step, {
	STEP_HANDLE_SOURCE_ACTION,
	STEP_HANDLE_SOURCE_SUCCESSOR,
	STEP_HANDLE_TARGET_PREDECESSOR,
	StepData,
} from "@/schemas/grafcet/step.schema";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { useTheme } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";

import { getStepVariableId } from "@/project-analyser/analysers/grafcet/grafcet.analyser";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useGrafcetStore } from "../context/GrafcetContext";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type StepNodeType = Node<StepData> & { type: "step" };

export type StepNodeProps = NodeProps<StepNodeType>;

const StepNode: FC<StepNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [editingNumber, setEditingNumber, editing, setEditing, saveNumber, error] = useWithTextNodeValue(
		id,
		"step",
		data,
		"number",
		true,
	);
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const stepVariableId = getStepVariableId(grafcetId, data.number as number);
	const activeInSimulation = useProjectStore(
		(state) => state.simulationVariablesStates[stepVariableId]?.value === true,
	);
	const forcedValue = useProjectStore((state) => state.forcedVariables[stepVariableId]);
	const isForced = forcedValue !== undefined;

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
				sx={{
					width: Step.DEFAULT_DIMENSIONS.width + "px",
					height: Step.DEFAULT_DIMENSIONS.height + "px",
					borderWidth: data.initial ? "4px" : "1px",
					borderStyle: data.initial ? "double" : "solid",
					borderColor: isForced ? "warning.main" : borderColor,
					borderRadius: "5px",
					backgroundColor: activeInSimulation ? "primary.main" : "white",
					color: activeInSimulation ? "white" : "black",
					transition: "background .2s ease, borderColor .2s ease",
					"&:hover": {
						backgroundColor: activeInSimulation ? "primary.main" : "#efefef",
					},
					display: "flex",
					justifyContent: "center",
					position: "relative",
				}}
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
							if (e.key.length == 1 && !range(0, 10).includes(parseInt(e.key)))
								e.preventDefault();
						}
					}}
					onBlur={() => {
						setEditing(false);
						saveNumber();
					}}
					style={{
						width: "100%",
						height: "100%",
						textAlign: "center",
						border: "none",
						outline: "none",
						borderRadius: "5px",
						padding: 0,
						pointerEvents: !editing ? "none" : "all",
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepNode;
