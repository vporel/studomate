"use client";

import AnalyserToolbarItem from "@/ui/components/programs/AnalyserToolbarItem";
import ExportProgramTool from "@/ui/components/programs/ExportProgramTool";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import useCanEditActivePage from "@/ui/components/projects/useCanEditActivePage";
import FlexBox from "@/ui/lib/boxes/FlexBox";
import type { PdfExportProgramConfig } from "@/ui/pdf/usePdfExport";
import type { GrafcetToolId } from "@/ui/stores/project/editor-tools";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { Divider } from "@mui/material";
import React, { type ReactElement, useCallback } from "react";
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
import useGrafcetToolAvailable from "./useGrafcetToolAvailable";

type ToolbarTool = { id: GrafcetToolId; element: ReactElement };

const TOOL_GROUPS: { id: string; tools: ToolbarTool[] }[] = [
	{
		id: "nodes",
		tools: [
			{ id: "step-initial", element: <StepTool initial={true} /> },
			{ id: "step", element: <StepTool /> },
			{ id: "action", element: <ActionTool /> },
			{ id: "transition", element: <TransitionTool /> },
		],
	},
	{
		id: "junctions",
		tools: [
			{ id: "junction-or-start", element: <JunctionOrStartTool /> },
			{ id: "junction-or-end", element: <JunctionOrEndTool /> },
			{ id: "junction-and-start", element: <JunctionAndStartTool /> },
			{ id: "junction-and-end", element: <JunctionAndEndTool /> },
		],
	},
	{
		id: "referrals",
		tools: [
			{ id: "step-referral-source", element: <StepReferralSourceTool /> },
			{ id: "step-referral-target", element: <StepReferralTargetTool /> },
		],
	},
	{ id: "comment", tools: [{ id: "comment", element: <CommentTool /> }] },
];

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
	const isToolAvailable = useGrafcetToolAvailable();
	const toolGroups = TOOL_GROUPS.map((group) => ({
		...group,
		tools: group.tools.filter(({ id }) => isToolAvailable(id)),
	})).filter((group) => group.tools.length > 0);

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
				{toolGroups.map((group, index) => (
					<React.Fragment key={group.id}>
						{index > 0 && (
							<Divider orientation="vertical" style={{ margin: "10px 5px" }} />
						)}
						{group.tools.map(({ id, element }) => (
							<React.Fragment key={id}>{element}</React.Fragment>
						))}
					</React.Fragment>
				))}
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
