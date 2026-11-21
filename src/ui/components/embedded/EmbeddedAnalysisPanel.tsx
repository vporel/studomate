"use client";

import { useT } from "@/ui/i18n/useT";
import { useCallback } from "react";
import BottomPanelTabs from "../bottom-panel/BottomPanelTabs";
import useAnalysisStatus from "../projects/analysis-result/useAnalysisStatus";
import AnalysisResultSections from "../projects/analysis-result/AnalysisResultSections";
import { useProjectStore } from "../projects/ProjectContext";
import useGotoProgram from "../projects/useGotoProgram";

export function useEmbeddedAnalysisPanelVisible() {
	return useProjectStore((state) => state.ui.analysisResultVisible);
}

/**
 * Analysis results, in the pane below the page area. Going to a program selects its tab, and
 * does nothing for a program that is not one of the views of the block.
 */
export default function EmbeddedAnalysisPanel() {
	const t = useT("projects.analysisResult");
	const visible = useEmbeddedAnalysisPanelVisible();
	const status = useAnalysisStatus();
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
		<BottomPanelTabs
			tabs={[
				{
					id: "analysis",
					label: status.label,
					color: status.color,
					content: <AnalysisResultSections onGotoProgram={onGotoProgram} />,
				},
			]}
			activeId="analysis"
			onSelect={() => {}}
			onClose={() => setVisible(false)}
			closeLabel={t("close")}
			closeAriaLabel="close-analysis-errors"
		/>
	);
}
