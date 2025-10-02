"use client";
import { range } from "@/lib/array";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import Step, { StepData } from "@/schemas/grafcet/Step.class";
import { useTheme } from "@mui/material";
import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import React, { type FC } from "react";
import GrafcetNode from "./GrafcetNode";

export type StepNodeType = Node<StepData> & { type: "step" };

export type StepNodeProps = NodeProps<StepNodeType>;

const StepNode: FC<StepNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const { updateNodeData } = useReactFlow();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [editing, setEditing] = React.useState(false);
	const borderColor = selected ? th.palette.primary.main : "black";

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
					value={data.number}
					onKeyDown={(e) => {
						if (e.key.length == 1 && !range(0, 10).includes(parseInt(e.key))) e.preventDefault();
					}}
					onChange={(e) =>
						updateNodeData(id, {
							...data,
							number:
								e.target.value == "" || parseInt(e.target.value) < 0
									? ""
									: parseInt(e.target.value),
						})
					}
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
					onBlur={() => setEditing(false)}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepNode;
