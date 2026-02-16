"use client";
import { range } from "@/lib/array";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Step, { StepData } from "@/schemas/grafcet/Step.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { useCallback, useEffect, type FC } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
import GrafcetNode from "./GrafcetNode";

export type StepNodeType = Node<StepData> & { type: "step" };

export type StepNodeProps = NodeProps<StepNodeType>;

const StepNode: FC<StepNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [editing, setEditing] = React.useState(false);
	const [editingNumber, setEditingNumber] = React.useState(data.number + "");
	const borderColor = selected ? th.palette.primary.main : "black";
	const updateNodeData = useGrafcetStore((state) => state.updateNodeData);

	const saveNumber = useCallback(() => {
		const number: number | "" =
			editingNumber === "" || isNaN(parseInt(editingNumber)) || parseInt(editingNumber) < 0
				? ""
				: parseInt(editingNumber);
		updateNodeData(id, {
			number,
		});
	}, [editingNumber, updateNodeData, id]);

	useEffect(() => {
		if (!editing) setEditingNumber(data.number + "");
	}, [data, editing]);

	return (
		<>
			<HandleWithConnectionsLimit
				limit={10}
				id="from-transition"
				type="target"
				position={Position.Top}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<HandleWithConnectionsLimit
				limit={1}
				id="to-transition"
				type="source"
				position={Position.Bottom}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<HandleWithConnectionsLimit
				limit={1}
				id="to-action"
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
				sx={{
					width: Step.defaultDimensions.width + "px",
					height: Step.defaultDimensions.height + "px",
					borderWidth: data.isInitial ? "4px" : "1px",
					borderStyle: data.isInitial ? "double" : "solid",
					borderColor: borderColor,
					borderRadius: "5px",
					backgroundColor: "white",
					transition: "background .2s ease, borderColor .2s ease",
					"&:hover": {
						background: "#efefef",
					},
					display: "flex",
					justifyContent: "center",
				}}
				onDoubleClick={() => {
					setEditing(true);
					inputRef.current?.focus();
				}}
			>
				<input
					ref={inputRef}
					className="node__input"
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
						boxSizing: "border-box",
						padding: 0,
						pointerEvents: !editing ? "none" : "all",
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepNode;
