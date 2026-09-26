"use client";
import {
	STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR,
	StepReferralTargetData,
} from "@/schemas/grafcet/step-referral-target.schema";
import StepReferral from "@/schemas/grafcet/step-referral.schema";
import GrafcetHandle from "./GrafcetHandle";
import { useTheme } from "@mui/material";
import { Node, NodeProps, Position } from "@xyflow/react";
import React, { type FC } from "react";

import GrafcetNode from "./GrafcetNode";
import ReferralArrow from "./ReferralArrow";
import StepNumberInput from "./StepNumberInput";
import useWithTextNodeValue from "./useWithTextNodeValue";

export type StepReferralTargetNodeType = Node<StepReferralTargetData> & {
	type: "step-referral-target";
};

export type StepReferralTargetNodeProps = NodeProps<StepReferralTargetNodeType>;

const StepReferralTargetNode: FC<StepReferralTargetNodeProps> = ({
	id,
	data,
	selected,
}) => {
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
	] = useWithTextNodeValue(
		id,
		"step-referral-target",
		data,
		"sourceStepNumber",
		true,
	);

	return (
		<>
			<GrafcetHandle
				limit={1}
				id={STEP_REFERRAL_TARGET_HANDLE_SOURCE_SUCCESSOR}
				type="source"
				position={Position.Bottom}
				color={borderColor}
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
				<StepNumberInput
					inputRef={inputRef}
					className="step_referral_target_node__input"
					value={editingSourceStepNumber}
					editing={editing}
					onChange={setEditingSourceStepNumber}
					onCommit={() => {
						setEditing(false);
						saveSourceStepNumber();
					}}
				/>
				<ReferralArrow color={borderColor} arrowTop="-7px" />
			</GrafcetNode>
		</>
	);
};

export default StepReferralTargetNode;
