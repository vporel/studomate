"use client";

import { useT } from "@/ui/i18n/useT";
import { ProjectMode } from "@/ui/stores/project/project-mode.enum";
import { Box, Button } from "@mui/material";
import { useShallow } from "zustand/shallow";
import useAnalysisStatus from "../projects/analysis-result/useAnalysisStatus";
import { useProjectStore } from "../projects/ProjectContext";
import type { EmbeddedControl } from "./embedded-app.types";

export const EMBEDDED_STATUS_BAR_CONTROLS: readonly EmbeddedControl[] = [
	"watch",
	"analysis",
];

const BUTTON_SX = {
	fontWeight: "normal",
	height: "100%",
	py: 0,
	px: "3px",
	"&:hover": { backgroundColor: "rgb(230,230,230)" },
};

export default function EmbeddedStatusBar({
	controls,
}: {
	controls: readonly EmbeddedControl[];
}) {
	const t = useT("chrome.footerActions");
	const analysisStatus = useAnalysisStatus();
	const {
		mode,
		setWatchTablesVisible,
		setAnalysisResultVisible,
		analysisShown,
	} = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			setWatchTablesVisible: state.setWatchTablesVisible,
			setAnalysisResultVisible: state.setAnalysisResultVisible,
			analysisShown: state.ui.analysisResultVisible,
		})),
	);

	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				justifyContent: "flex-end",
				gap: 1,
				flexShrink: 0,
				height: 28,
				px: 1,
				backgroundColor: "white",
				borderTop: "1px solid lightgray",
			}}
		>
			{controls.includes("watch") && mode === ProjectMode.SIMULATION && (
				<Button sx={BUTTON_SX} onClick={() => setWatchTablesVisible(true)}>
					{t("watchTables")}
				</Button>
			)}
			{controls.includes("analysis") &&
				mode === ProjectMode.DESIGN &&
				!analysisShown && (
					<Button
						sx={{ ...BUTTON_SX, color: analysisStatus.color }}
						onClick={() => setAnalysisResultVisible(true)}
					>
						{analysisStatus.label}
					</Button>
				)}
		</Box>
	);
}
