"use client";

import ExcludedFromExecutionWarning from "@/ui/components/programs/ExcludedFromExecutionWarning";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Divider } from "@mui/material";
import React from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
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
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const excludedFromExecution = useGrafcetStore(
		(state) => state.grafcet.excludedFromExecution,
	);
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);

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
				{excludedFromExecution && (
					<ExcludedFromExecutionWarning
						includeDisabled={!designing}
						onInclude={() =>
							grafcetsManager.setExcludedFromExecution(grafcetId, false)
						}
					/>
				)}
				<ZoomInTool />
				<ZoomOutTool />
			</FlexBox>
		</FlexBox>
	);
};

export default GrafcetToolbar;
