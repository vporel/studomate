import { useT } from "@/ui/i18n/useT";
import { useShallow } from "zustand/shallow";
import { useProjectStore } from "../ProjectContext";

/** The label and colour summing up the last analysis, as the status bar and the panel show it. */
export default function useAnalysisStatus(): { label: string; color: string } {
	const t = useT("chrome.footerActions");
	const { hasErrors, hasWarnings } = useProjectStore(
		useShallow((state) => ({
			hasErrors: state.analysisHasErrors,
			hasWarnings: state.analysisHasWarnings,
		})),
	);

	if (hasErrors)
		return { label: `${t("analysisResults")} ${t("errors")}`, color: "red" };
	if (hasWarnings)
		return {
			label: `${t("analysisResults")} ${t("warnings")}`,
			color: "orange",
		};
	return { label: `${t("analysisResults")} ${t("ok")}`, color: "black" };
}
