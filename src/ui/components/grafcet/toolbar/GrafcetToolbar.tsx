"use client";

import AnalyserToolbarItem from "@/ui/components/programs/AnalyserToolbarItem";
import ExportProgramTool from "@/ui/components/programs/ExportProgramTool";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { Divider } from "@mui/material";
import React, { useCallback } from "react";
import { useGrafcetStore, useGrafcetStoreApi } from "../context/GrafcetContext";
import ActionTool from "./ActionTool";
import CommentTool from "./CommentTool";
import GrafcetZoomTools from "./GrafcetZoomTools";
import JunctionAndEndTool from "./JunctionAndEndTool";
import JunctionAndStartTool from "./JunctionAndStartTool";
import JunctionOrEndTool from "./JunctionOrEndTool";
import JunctionOrStartTool from "./JunctionOrStartTool";
import StepReferralSourceTool from "./StepReferralSourceTool";
import StepReferralTargetTool from "./StepReferralTargetTool";
import StepTool from "./StepTool";
import TransitionTool from "./TransitionTool";

const GrafcetToolbar = ({ style }: { style?: React.CSSProperties }) => {
	const grafcetStore = useGrafcetStoreApi();
	const grafcetId = useGrafcetStore((state) => state.grafcet.id);
	const getExportConfig = useCallback(
		(): PdfExportProgramConfig => ({
			type: "grafcet",
			program: grafcetStore.getState().grafcet,
		}),
		[grafcetStore],
	);
	const excludedFromExecution = useGrafcetStore(
		(state) => state.grafcet.excludedFromExecution,
	);
	const canBeExcludedFromExecution = useGrafcetStore((state) =>
		state.grafcet.canBeExcludedFromExecution(),
	);
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const simulating = useProjectStore(
		(state) => state.mode === ProjectMode.SIMULATION,
	);
	const exclusionToggleAvailable = useProjectStore(
		(state) => state.capabilities.programExecutionExclusionToggle,
	);
	const designing = useCanEditActivePage();

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
			<FlexBox
				data-tour="toolbar"
				centerVertical
				sx={{ gap: "5px", height: "100%" }}
			>
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
				{(excludedFromExecution || canBeExcludedFromExecution) && (
					<AnalyserToolbarItem
						excluded={excludedFromExecution}
						simulating={simulating}
						toggleAvailable={exclusionToggleAvailable}
						disabled={!designing}
						onToggle={(excluded) =>
							grafcetsManager.setExcludedFromExecution(grafcetId, excluded)
						}
					/>
				)}
				<ExportProgramTool getConfig={getExportConfig} />
				<GrafcetZoomTools />
			</FlexBox>
		</FlexBox>
	);
};

export default GrafcetToolbar;
