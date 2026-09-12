"use client";

import { useAppContext } from "@/ui/components/AppContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useViewMenu(): AppMenuType {
	const { viewAppearance, setViewAppearance } = useAppContext();
	const crossReferenceResultVisible = useProjectStore(
		(state) => state.ui.crossReferenceResultVisible,
	);
	const setCrossReferenceResultVisible = useProjectStore(
		(state) => state.setCrossReferenceResultVisible,
	);
	const analysisResultVisible = useProjectStore(
		(state) => state.ui.analysisResultVisible,
	);
	const setAnalysisResultVisible = useProjectStore(
		(state) => state.setAnalysisResultVisible,
	);
	const t = useT("menu.view");

	return useMemo(
		() => ({
			id: "view",
			label: t("title"),
			items: [
				[
					{
						label: t("explorer"),
						checked: viewAppearance.explorer,
						onClick: () =>
							setViewAppearance({
								...viewAppearance,
								explorer: !viewAppearance.explorer,
							}),
					},
				],
				[
					{
						label: t("crossReferences"),
						checked: crossReferenceResultVisible,
						onClick: () =>
							setCrossReferenceResultVisible(!crossReferenceResultVisible),
					},
					{
						label: t("analysisResults"),
						checked: analysisResultVisible,
						onClick: () => setAnalysisResultVisible(!analysisResultVisible),
					},
				],
			],
		}),
		[
			viewAppearance,
			setViewAppearance,
			crossReferenceResultVisible,
			setCrossReferenceResultVisible,
			analysisResultVisible,
			setAnalysisResultVisible,
			t,
		],
	);
}
