"use client";

import useCanEdit from "@/ui/components/projects/useCanEdit";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import AnalyserToolbarItem from "@/ui/components/programs/AnalyserToolbarItem";
import ExportProgramPdfTool from "@/ui/components/programs/ExportProgramPdfTool";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import { Divider } from "@mui/material";
import React, { useMemo } from "react";
import { useGrafcetStore } from "../context/GrafcetContext";
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
	const grafcet = useGrafcetStore((state) => state.grafcet);
	const grafcetId = grafcet.id;
	const exportConfig = useMemo<PdfExportProgramConfig>(
		() => ({ type: "grafcet", program: grafcet }),
		[grafcet],
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
	const designing = useCanEdit();

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
				<ExportProgramPdfTool config={exportConfig} />
				<GrafcetZoomTools />
			</FlexBox>
		</FlexBox>
	);
};

export default GrafcetToolbar;
