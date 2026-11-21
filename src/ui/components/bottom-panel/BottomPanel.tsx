"use client";

import { useT } from "@/ui/i18n/useT";
import {
	BottomPanelTab,
	getActiveBottomPanelTab,
} from "@/ui/stores/project/bottom-panel";
import AnalysisResult from "../projects/analysis-result/AnalysisResult";
import useAnalysisStatus from "../projects/analysis-result/useAnalysisStatus";
import CrossReferenceResult from "../projects/cross-reference/CrossReferenceResult";
import { useProjectStore } from "../projects/ProjectContext";
import BottomPanelTabs, { BottomPanelTabItem } from "./BottomPanelTabs";

/** The tab shown in the bottom panel below the editors; the panel is hidden when it is `null`. */
export function useActiveBottomPanelTab() {
	return useProjectStore((state) => getActiveBottomPanelTab(state.ui));
}

export default function BottomPanel() {
	const tAnalysis = useT("projects.analysisResult");
	const tCrossReference = useT("crossReference");
	const analysisStatus = useAnalysisStatus();
	const activeTab = useActiveBottomPanelTab();
	const setAnalysisResultVisible = useProjectStore(
		(state) => state.setAnalysisResultVisible,
	);
	const setCrossReferenceResultVisible = useProjectStore(
		(state) => state.setCrossReferenceResultVisible,
	);

	const setTabOpen: Record<BottomPanelTab, (open: boolean) => void> = {
		analysis: setAnalysisResultVisible,
		crossReference: setCrossReferenceResultVisible,
	};
	const tabs: BottomPanelTabItem<BottomPanelTab>[] = [
		{
			id: "crossReference",
			label: tCrossReference("footerButton"),
			dataTour: "crossReference",
			content: <CrossReferenceResult />,
		},
		{
			id: "analysis",
			label: analysisStatus.label,
			color: analysisStatus.color,
			dataTour: "analysis",
			content: <AnalysisResult />,
		},
	];

	return (
		<BottomPanelTabs
			tabs={tabs}
			activeId={activeTab}
			onSelect={(tab) => setTabOpen[tab](true)}
			onClose={() => activeTab && setTabOpen[activeTab](false)}
			closeLabel={tAnalysis("close")}
			closeAriaLabel="close-bottom-panel"
		/>
	);
}
