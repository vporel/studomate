"use client";

import BottomPanel from "../BottomPanel";
import { useProjectStore } from "../ProjectContext";
import useGotoProgram from "../useGotoProgram";
import { useT } from "@/ui/i18n/useT";

import AnalysisResultSections from "./AnalysisResultSections";

export default function AnalysisResult() {
	const t = useT("projects.analysisResult");
	const analysisResultVisible = useProjectStore(
		(s) => s.ui.analysisResultVisible,
	);
	const setAnalysisResultVisible = useProjectStore(
		(s) => s.setAnalysisResultVisible,
	);

	const onClose = () => {
		setAnalysisResultVisible(false);
	};

	const onGotoProgram = useGotoProgram();

	if (!analysisResultVisible) return null;

	return (
		<BottomPanel
			title={t("title")}
			closeLabel={t("close")}
			closeAriaLabel="close-analysis-errors"
			onClose={onClose}
		>
			<AnalysisResultSections onGotoProgram={onGotoProgram} />
		</BottomPanel>
	);
}
