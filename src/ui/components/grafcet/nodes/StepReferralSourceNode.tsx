"use client";
import {
	STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR,
	StepReferralSourceData,
} from "@/schemas/grafcet/step-referral-source.schema";
import StepReferral from "@/schemas/grafcet/step-referral.schema";
import GrafcetHandle from "./GrafcetHandle";
import { useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";

import GrafcetNode from "./GrafcetNode";
import ReferralArrow from "./ReferralArrow";
import StepNumberInput from "./StepNumberInput";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type StepReferralSourceNodeType = Node<StepReferralSourceData> & {
	type: "step-referral-source";
};

export type StepReferralSourceNodeProps = NodeProps<StepReferralSourceNodeType>;

const StepReferralSourceNode: FC<StepReferralSourceNodeProps> = ({
	id,
	data,
	selected,
}) => {
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
	] = useWithTextNodeValue(
		id,
		"step-referral-source",
		data,
		"targetStepNumber",
		true,
	);

	return (
		<>
			<GrafcetHandle
				limit={1}
				id={STEP_REFERRAL_SOURCE_HANDLE_TARGET_PREDECESSOR}
				type="target"
				position={Position.Top}
				color={borderColor}
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
				<ReferralArrow color={borderColor} arrowTop="11px" />
				<StepNumberInput
					inputRef={inputRef}
					className="step_referral_source_node__input"
					value={editingTargetStepNumber}
					editing={editing}
					onChange={setEditingTargetStepNumber}
					onCommit={() => {
						setEditing(false);
						saveTargetStepNumber();
					}}
				/>
			</GrafcetNode>
		</>
	);
};

export default StepReferralSourceNode;
