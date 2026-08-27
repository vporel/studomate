"use client";

import { PROJECT_PROPERTIES_PAGE_DATA } from "@/ui/components/pages/ProjectPropertiesPage";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { platformShortcut } from "@/ui/lib/platform";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useProjectMenu(): AppMenuType {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const laddersManager = useProjectStore((state) => state.laddersManager);
	const pageManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const { isSharedProject, shareProject, setShareModalVisible } =
		useProjectStore(
			useShallow((state) => ({
				isSharedProject: state.isSharedProject,
				shareProject: state.shareProject,
				setShareModalVisible: state.setShareModalVisible,
			})),
		);

	return useMemo(
		() => ({
			id: "project",
			label: "Projet",
			items: [
				[
					{
						label: "Nouveau grafcet",
						shortcut: platformShortcut("Ctrl+G", "Cmd+G"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							grafcetsManager.newGrafcet();
						},
					},
					{
						label: "Nouveau ladder",
						shortcut: platformShortcut("Ctrl+L", "Cmd+L"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							laddersManager.newLadder();
						},
					},
				],
				[
					{
						label: "Propriétés",
						onClick: () => pageManager.openPage(PROJECT_PROPERTIES_PAGE_DATA),
					},
				],
				[
					{
						label: "Partager",
						disabled: isSharedProject,
						onClick: () => {
							if (isSharedProject) return;
							void shareProject();
						},
					},
					...(isSharedProject
						? []
						: [
								{
									label: "Gérer le partage",
									onClick: () => setShareModalVisible(true),
								},
							]),
				],
			],
		}),
		[
			grafcetsManager,
			laddersManager,
			pageManager,
			designing,
			isSharedProject,
			shareProject,
			setShareModalVisible,
		],
	);
}
