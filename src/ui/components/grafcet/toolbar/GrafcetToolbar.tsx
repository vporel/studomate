"use client";

import { Box, Divider } from "@mui/material";
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

const GrafcetToolbar = ({ style }: { style?: React.CSSProperties }) => {
	return (
		<Box
			className="grafcet-toolbar"
			style={{
				width: "100%",
				height: "38px",
				borderBottom: "1px solid lightgray",
				backgroundColor: "white",
				padding: "10px 5px",
				display: "flex",
				alignItems: "center",
				gap: "5px",
				...style,
			}}
		>
			<StepTool initial={true} />
			<StepTool />
			<ActionTool />
			<TransitionTool />
			<Divider orientation="vertical" style={{ margin: "10px 0" }} />
			<JunctionOrStartTool />
			<JunctionOrEndTool />
			<JunctionAndStartTool />
			<JunctionAndEndTool />
			<Divider orientation="vertical" style={{ margin: "10px 0" }} />
			<StepReferralSourceTool />
			<StepReferralTargetTool />
			<Divider orientation="vertical" style={{ margin: "10px 0" }} />
			<CommentTool />
		</Box>
	);
};

export default GrafcetToolbar;
