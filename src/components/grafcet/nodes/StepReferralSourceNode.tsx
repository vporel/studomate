"use client";
import { range } from "@/lib/array";
import HandleWithConnectionsLimit from "@/lib/react-flow/HandleWithConnectionsLimit";
import StepReferral from "@/schemas/grafcet/StepReferral.class";
import { StepReferralSourceData } from "@/schemas/grafcet/StepReferralSource.class";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, Position, useReactFlow } from "@xyflow/react";
import React, { type FC } from "react";
import GrafcetNode from "./GrafcetNode";

export type StepReferralSourceNodeType = Node<StepReferralSourceData> & {
	type: "step-referral-source";
};

export type StepReferralSourceNodeProps = NodeProps<StepReferralSourceNodeType>;

const StepReferralSourceNode: FC<StepReferralSourceNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const { updateNodeData } = useReactFlow();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [editing, setEditing] = React.useState(false);
	const borderColor = selected ? th.palette.primary.main : "black";

	return (
		<>
			<HandleWithConnectionsLimit
				limit={1}
				id="from-step"
				type="target"
				position={Position.Top}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type="step-referral-source"
				sx={{
					width: StepReferral.defaultDimensions.width + "px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "5px",
				}}
				onDoubleClick={() => {
					setEditing(true);
					inputRef.current?.focus();
				}}
			>
				<Box
					sx={{
						width: "1px",
						height: "20px",
						background: borderColor,
						position: "relative",
						"&::before, &::after": {
							content: '""',
							position: "absolute",
							width: "1px",
							height: "10px",
							background: borderColor,
						},
						"&::before": {
							transform: "rotate(-45deg)",
							top: "11px",
							left: "-4px",
						},
						"&::after": {
							transform: "rotate(45deg)",
							top: "11px",
							left: "4px",
						},
					}}
				></Box>
				<input
					ref={inputRef}
					className="node__input"
					type="text" //The values are restricted to numbers via the keydown event (because the type='number' causes issues when exporting the nodes to image)
					value={data.targetStepNumber}
					onKeyDown={(e) => {
						if (e.key.length == 1 && !range(0, 10).includes(parseInt(e.key))) e.preventDefault();
					}}
					onChange={(e) =>
						updateNodeData(id, {
							...data,
							destinationStepNumber:
								e.target.value == "" || parseInt(e.target.value) < 0
									? ""
									: parseInt(e.target.value),
						})
					}
					style={{
						width: "100%",
						textAlign: "center",
						border: "none",
						outline: "none",
						pointerEvents: !editing ? "none" : "all",
					}}
					onBlur={() => setEditing(false)}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepReferralSourceNode;
