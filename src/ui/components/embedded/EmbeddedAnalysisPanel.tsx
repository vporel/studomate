"use client";

import { useT } from "@/ui/i18n/useT";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Divider, IconButton, Tooltip, Typography } from "@mui/material";
import { useCallback } from "react";
import AnalysisResultSections from "../projects/analysis-result/AnalysisResultSections";
import { useProjectStore } from "../projects/ProjectContext";
import useGotoProgram from "../projects/useGotoProgram";

/**
 * Analysis results, laid over the bottom of the page area. Going to a program selects its tab,
 * and does nothing for a program that is not one of the views of the block.
 */
export default function EmbeddedAnalysisPanel() {
	const t = useT("projects.analysisResult");
	const visible = useProjectStore((state) => state.ui.analysisResultVisible);
	const setVisible = useProjectStore((state) => state.setAnalysisResultVisible);
	const pagesManager = useProjectStore((state) => state.pagesManager);
	const pagesOrder = useProjectStore((state) => state.pagesOrder);

	const selectOpenTab = useCallback(
		(page: { id: string }) => {
			if (!pagesOrder.includes(page.id)) return false;
			pagesManager.setActivePage(page.id);
			return true;
		},
		[pagesManager, pagesOrder],
	);
	const onGotoProgram = useGotoProgram(selectOpenTab);

	if (!visible) return null;

	return (
		<Box
			sx={{
				position: "absolute",
				left: 0,
				right: 0,
				bottom: 0,
				height: "45%",
				zIndex: 6,
				display: "flex",
				flexDirection: "column",
				px: 2,
				py: 1,
				backgroundColor: "white",
				borderTop: "1px solid lightgray",
				boxShadow: "0 -2px 6px rgba(0, 0, 0, 0.08)",
			}}
		>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
				}}
			>
				<Typography variant="h6">{t("title")}</Typography>
				<Tooltip title={t("close")}>
					<IconButton
						size="small"
						aria-label="close-analysis-errors"
						onClick={() => setVisible(false)}
					>
						<CloseIcon />
					</IconButton>
				</Tooltip>
			</Box>
			<Divider sx={{ my: 1 }} />
			<AnalysisResultSections onGotoProgram={onGotoProgram} />
		</Box>
	);
}
