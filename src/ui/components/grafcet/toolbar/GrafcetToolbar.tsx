"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Divider } from "@mui/material";
import React from "react";
import ActionTool from "./ActionTool";
import CommentTool from "./CommentTool";
import JunctionAndEndTool from "./JunctionAndEndTool";
import JunctionAndStartTool from "./JunctionAndStartTool";
import JunctionOrEndTool from "./JunctionOrEndTool";
import JunctionOrStartTool from "./JunctionOrStartTool";
import StepReferralSourceTool from "./StepReferralSourceTool";
import StepReferralTargetTool from "./StepReferralTargetTool";
import StepTool from "./StepTool";
import TransitionTool from "./TransitionTool";
import ZoomInTool from "./ZoomInTool";
import ZoomOutTool from "./ZoomOutTool";

const GrafcetToolbar = ({ style }: { style?: React.CSSProperties }) => {
	return (
		<FlexBox
			className="grafcet-toolbar"
			centerVertical
			between
			style={{
				width: "100%",
				height: "38px",
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
				padding: "10px 5px",
				gap: "5px",
				...style,
			}}
		>
			<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
				<StepTool initial={true} />
				<StepTool />
				<ActionTool />
				<TransitionTool />
				<Divider orientation="vertical" style={{ margin: "10px 5px" }} />
				<JunctionOrStartTool />
				<JunctionOrEndTool />
				<JunctionAndStartTool />
				<JunctionAndEndTool />
				<Divider orientation="vertical" style={{ margin: "10px 5px" }} />
				<StepReferralSourceTool />
				<StepReferralTargetTool />
				<Divider orientation="vertical" style={{ margin: "10px 5px" }} />
				<CommentTool />
			</FlexBox>
			<FlexBox centerVertical sx={{ gap: "5px", height: "100%" }}>
				<ZoomInTool />
				<ZoomOutTool />
			</FlexBox>
		</FlexBox>
	);
};

export default GrafcetToolbar;
