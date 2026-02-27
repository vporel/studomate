"use client";
import { range } from "@/lib/array";
import { StepReferralTargetData } from "@/schemas/grafcet/step-referral-target.schema";
import StepReferral from "@/schemas/grafcet/step-referral.schema";
import HandleWithConnectionsLimit from "@/ui/lib/react-flow/HandleWithConnectionsLimit";
import { Box, useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";
import GrafcetNode from "./GrafcetNode";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type StepReferralTargetNodeType = Node<StepReferralTargetData> & {
	type: "step-referral-target";
};

export type StepReferralTargetNodeProps = NodeProps<StepReferralTargetNodeType>;

const StepReferralTargetNode: FC<StepReferralTargetNodeProps> = ({ id, data, selected }) => {
	const th = useTheme();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const borderColor = selected ? th.palette.primary.main : "black";
	const [
		editingSourceStepNumber,
		setEditingSourceStepNumber,
		editing,
		setEditing,
		saveSourceStepNumber,
		error,
	] = useWithTextNodeValue(id, "step-referral-target", data, "sourceStepNumber", true);

	return (
		<>
			<HandleWithConnectionsLimit
				limit={1}
				id="to-step"
				type="source"
				position={Position.Bottom}
				style={{
					borderColor: borderColor,
					backgroundColor: borderColor,
				}}
			/>
			<GrafcetNode
				id={id}
				type="step-referral-target"
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
				<input
					ref={inputRef}
					className="node__input"
					type="text" //The values are restricted to numbers via the keydown event (because the type='number' causes issues when exporting the nodes to image)
					value={editingSourceStepNumber}
					onChange={(e) => setEditingSourceStepNumber(e.target.value)}
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
						saveSourceStepNumber();
					}}
					style={{
						width: "100%",
						textAlign: "center",
						border: "none",
						outline: "none",
						pointerEvents: !editing ? "none" : "all",
					}}
				/>
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
							top: "-7px",
							left: "-4px",
						},
						"&::after": {
							transform: "rotate(45deg)",
							top: "-7px",
							left: "4px",
						},
					}}
				></Box>
			</GrafcetNode>
		</>
	);
};

export default StepReferralTargetNode;
