"use client";

import FlexBox from "@/ui/lib/boxes/FlexBox";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Button } from "@mui/material";
import { useT } from "@/ui/i18n/useT";
import { useProjectStore } from "../projects/ProjectContext";

const RightActions = () => {
	const t = useT("chrome.footerActions");
	const analysisHasErrors = useProjectStore((state) => state.analysisHasErrors);
	const analysisHasWarnings = useProjectStore(
		(state) => state.analysisHasWarnings,
	);
	const setAnalysisResultVisible = useProjectStore(
		(state) => state.setAnalysisResultVisible,
	);
	const setWatchTablesVisible = useProjectStore(
		(state) => state.setWatchTablesVisible,
	);
	const mode = useProjectStore((state) => state.mode);
	const hmiManager = useProjectStore((state) => state.hmiManager);
	const hasHmiPages = useProjectStore(
		(state) => Object.keys(state.project?.hmiPages ?? {}).length > 0,
	);

	return (
		<FlexBox centerVertical gap={1} sx={{ justifyContent: "flex-end" }}>
			{mode === ProjectMode.SIMULATION && (
				<Button
					sx={{
						fontWeight: "normal",
						height: "100%",
						py: "0",
						px: "3px",
						"&:hover": { backgroundColor: "rgb(230,230,230)" },
					}}
					onClick={() => setWatchTablesVisible(true)}
				>
					{t("watchTables")}
				</Button>
			)}
			{mode === ProjectMode.SIMULATION && hasHmiPages && (
				<Button
					sx={{
						fontWeight: "normal",
						height: "100%",
						py: "0",
						px: "3px",
						"&:hover": { backgroundColor: "rgb(230,230,230)" },
					}}
					onClick={() => hmiManager.openHmiSimulationPageIfAny()}
				>
					{t("hmiSimulation")}
				</Button>
			)}
			<Button
				sx={{
					color: analysisHasErrors
						? "red"
						: analysisHasWarnings
							? "orange"
							: "black",
					fontWeight: "normal",
					height: "100%",
					py: "0",
					px: "3px",
					"&:hover": { backgroundColor: "rgb(230,230,230)" },
				}}
				onClick={() => setAnalysisResultVisible(true)}
			>
				{`${t("analysisResults")} ${
					!analysisHasErrors && !analysisHasWarnings
						? t("ok")
						: analysisHasErrors
							? t("errors")
							: t("warnings")
				}`}
			</Button>
		</FlexBox>
	);
};

export default RightActions;
