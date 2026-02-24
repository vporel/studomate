"use client";
import { range } from "@/lib/array";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Step, { StepData } from "@/schemas/grafcet/Step.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";
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
				limit={4}
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
				error={error}
				sx={{
					width: Step.DEFAULT_DIMENSIONS.width + "px",
					height: Step.DEFAULT_DIMENSIONS.height + "px",
					borderWidth: data.initial ? "4px" : "1px",
					borderStyle: data.initial ? "double" : "solid",
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
