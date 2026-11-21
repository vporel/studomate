"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { Button } from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import useAnalysisStatus from "../projects/analysis-result/useAnalysisStatus";
import { getActiveBottomPanelTab } from "@/ui/stores/project/bottom-panel";
import { useProjectStore } from "../projects/ProjectContext";

const FOOTER_BUTTON_SX = {
	fontWeight: "normal",
	height: "100%",
	py: "0",
	px: "3px",
	"&:hover": { backgroundColor: "rgb(230,230,230)" },
} as const;

const RightActions = () => {
	const t = useT("chrome.footerActions");
	const tCrossRef = useT("crossReference");
	const analysisStatus = useAnalysisStatus();
	const bottomPanelOpen = useProjectStore(
		(state) => getActiveBottomPanelTab(state.ui) !== null,
	);
	const setAnalysisResultVisible = useProjectStore(
		(state) => state.setAnalysisResultVisible,
	);
	const setCrossReferenceResultVisible = useProjectStore(
		(state) => state.setCrossReferenceResultVisible,
	);
	const setWatchTablesVisible = useProjectStore(
		(state) => state.setWatchTablesVisible,
	);
	const mode = useProjectStore((state) => state.mode);
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const hasHmiPages = useProjectStore(
		(state) => Object.keys(state.project?.hmiPages ?? {}).length > 0,
	);

	const hasScene3d = useProjectStore((state) => !!state.project?.scene3d);
	const scene3dDisplayManager = useProjectStore(
		(state) => state.scene3dDisplayManager,
	);

	return (
		<FlexBox centerVertical gap={1} sx={{ justifyContent: "flex-end" }}>
			{/* First of the group: hiding them while the bottom panel shows them as tabs leaves the
			    buttons on their right in place. */}
			{!bottomPanelOpen && (
				<>
					<Button
						data-tour="crossReference"
						sx={{ ...FOOTER_BUTTON_SX, color: "black" }}
						onClick={() => setCrossReferenceResultVisible(true)}
					>
						{tCrossRef("footerButton")}
					</Button>
					<Button
						data-tour="analysis"
						sx={{ ...FOOTER_BUTTON_SX, color: analysisStatus.color }}
						onClick={() => setAnalysisResultVisible(true)}
					>
						{analysisStatus.label}
					</Button>
				</>
			)}
			{mode === ProjectMode.SIMULATION && (
				<Button
					sx={FOOTER_BUTTON_SX}
					onClick={() => setWatchTablesVisible(true)}
				>
					{t("watchTables")}
				</Button>
			)}
			{mode === ProjectMode.SIMULATION && hasHmiPages && (
				<Button
					sx={FOOTER_BUTTON_SX}
					onClick={() => hmiManager.openHmiSimulationPageIfAny()}
				>
					{t("hmiSimulation")}
				</Button>
			)}
			{hasScene3d && (
				<Button
					sx={{ ...FOOTER_BUTTON_SX, color: "black" }}
					onClick={() => scene3dDisplayManager.toggle()}
				>
					{t("scene3d")}
				</Button>
			)}
		</FlexBox>
	);
};

export default RightActions;
