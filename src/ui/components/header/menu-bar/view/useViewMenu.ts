"use client";

import { useAppContext } from "@/ui/components/AppContext";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { selectScene3dShownMode } from "@/ui/stores/project/managers/3d-scene/scene3d-display.manager";
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
	const hasScene3d = useProjectStore((state) => !!state.project?.scene3d);
	const scene3dDisplayManager = useProjectStore(
		(state) => state.scene3dDisplayManager,
	);
	const scene3dShownMode = useProjectStore(selectScene3dShownMode);
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
				...(hasScene3d
					? [
							[
								{
									label: t("scene3d"),
									subItems: scene3dDisplayManager.availableModes.map(
										(mode) => ({
											label: t(`scene3dMode.${mode}`),
											checked: scene3dShownMode === mode,
											onClick: () =>
												scene3dShownMode === mode
													? scene3dDisplayManager.close()
													: scene3dDisplayManager.show(mode),
										}),
									),
								},
							],
						]
					: []),
			],
		}),
		[
			viewAppearance,
			setViewAppearance,
			crossReferenceResultVisible,
			setCrossReferenceResultVisible,
			analysisResultVisible,
			setAnalysisResultVisible,
			hasScene3d,
			scene3dDisplayManager,
			scene3dShownMode,
			t,
		],
	);
}
