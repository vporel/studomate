"use client";

import { Box, Divider, Grid } from "@mui/material";
import React from "react";
import ActionTool from "./ActionTool";
import CommentTool from "./CommentTool";
import JunctionAndEndTool from "./JunctionAndEndTool";
import AndJunctionStartTool from "./JunctionAndStartTool";
import JunctionOrEndTool from "./JunctionOrEndTool";
import JunctionOrStartTool from "./JunctionOrStartTool";
import StepReferralSourceTool from "./StepReferralSourceTool";
import StepReferralTargetTool from "./StepReferralTargetTool";
import StepTool from "./StepTool";
import TransitionTool from "./TransitionTool";

const GrafcetToolbar = ({ style }: { style?: React.CSSProperties }) => {
	return (
		<div
			className="grafcet-toolbar"
			style={{
				height: "100%",
				width: "200px",
				borderRight: "1px solid lightgray",
				backgroundColor: "#efefef",
				padding: "10px",
				...style,
			}}
		>
			<Grid container spacing={1}>
				<Grid size={3}>
					<Box>
						<StepTool />
					</Box>
				</Grid>
				<Grid size={6}>
					<Box>
						<ActionTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<TransitionTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<JunctionOrStartTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<JunctionOrEndTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<AndJunctionStartTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<JunctionAndEndTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<StepReferralSourceTool />
					</Box>
				</Grid>
				<Grid size={3}>
					<Box>
						<StepReferralTargetTool />
					</Box>
				</Grid>
			</Grid>
			<Divider style={{ margin: "10px 0" }} />
			<Grid container spacing={1}>
				<Grid size={6}>
					<Box>
						<CommentTool />
					</Box>
				</Grid>
			</Grid>
		</div>
	);
};

export default GrafcetToolbar;
