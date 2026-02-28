"use client";
import { range } from "@/lib/array";
import {
	STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
	StepReferralSourceData,
} from "@/schemas/grafcet/step-referral-source.schema";
import StepReferral from "@/schemas/grafcet/step-referral.schema";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";

import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type StepReferralSourceNodeType = Node<StepReferralSourceData> & {
	type: "step-referral-source";
};

export type StepReferralSourceNodeProps = NodeProps<StepReferralSourceNodeType>;

const StepReferralSourceNode: FC<StepReferralSourceNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [
		editingTargetStepNumber,
		setEditingTargetStepNumber,
		editing,
		setEditing,
		saveTargetStepNumber,
		error,
	] = useWithTextNodeValue(id, "step-referral-source", data, "targetStepNumber", true);

	return (
		<>
			<HandleWithConnectionsLimit
				limit={1}
				id={STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR}
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
				error={error}
				sx={{
					width: StepReferral.DEFAULT_DIMENSIONS.width + "px",
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
					value={editingTargetStepNumber}
					onChange={(e) => setEditingTargetStepNumber(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === "Escape") {
							//The save is done only on blur to avoid multiple saves when pressing enter
							inputRef.current?.blur();
						} else if (e.key.length == 1 && !range(0, 10).includes(parseInt(e.key))) {
							e.preventDefault();
						}
					}}
					onBlur={() => {
						setEditing(false);
						saveTargetStepNumber();
					}}
					style={{
						width: "100%",
						textAlign: "center",
						border: "none",
						outline: "none",
						pointerEvents: !editing ? "none" : "all",
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepReferralSourceNode;
