"use client";

import { useT } from "@/ui/i18n/useT";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { Box, Button } from "@mui/material";
import { useShallow } from "zustand/shallow";
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
	const {
		mode,
		analysisHasErrors,
		analysisHasWarnings,
		setWatchTablesVisible,
		setAnalysisResultVisible,
	} = useProjectStore(
		useShallow((state) => ({
			mode: state.mode,
			analysisHasErrors: state.analysisHasErrors,
			analysisHasWarnings: state.analysisHasWarnings,
			setWatchTablesVisible: state.setWatchTablesVisible,
			setAnalysisResultVisible: state.setAnalysisResultVisible,
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
			{controls.includes("analysis") && mode === ProjectMode.DESIGN && (
				<Button
					sx={{
						...BUTTON_SX,
						color: analysisHasErrors
							? "red"
							: analysisHasWarnings
								? "orange"
								: "black",
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
			)}
		</Box>
	);
}
