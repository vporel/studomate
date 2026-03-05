"use client";

import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/grafcet.schema";
import { PROJECT_PROPERTIES_PAGE_DATA } from "@/ui/components/pages/ProjectPropertiesPage";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { platformShortcut } from "@/ui/lib/platform";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useMemo } from "react";
import { AppMenuType } from "../app-menu-bar";

export default function useProjectMenu(): AppMenuType {
	const grafcetsManager = useProjectStore((state) => state.grafcetsManager);
	const pageManager = useProjectStore((state) => state.pagesManager);
	const designing = useProjectStore((state) => state.mode === ProjectMode.DESIGN);

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
							grafcetsManager.newGrafcet(DEFAULT_GRAFCET_NAME, DEFAULT_GRAFCET_FORMAT);
						},
					},
				],
				[
					{
						label: "Propriétés",
						onClick: () => pageManager.openPage(PROJECT_PROPERTIES_PAGE_DATA),
					},
				],
			],
		}),
		[grafcetsManager, pageManager, designing],
	);
}
