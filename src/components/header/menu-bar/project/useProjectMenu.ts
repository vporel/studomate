"use client";

import { PROJECT_PROPERTIES_PAGE_DATA } from "@/components/pages/ProjectPropertiesPage";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { platformShortcut } from "@/lib/platform";
import { DEFAULT_GRAFCET_FORMAT, DEFAULT_GRAFCET_NAME } from "@/schemas/grafcet/Grafcet.class";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useProjectMenu(): AppMenuType {
	const { newGrafcet, openPage } = useProjectStore(
		useShallow((state) => ({
			newGrafcet: state.newGrafcet,
			openPage: state.openPage,
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
						onClick: () => newGrafcet(DEFAULT_GRAFCET_NAME, DEFAULT_GRAFCET_FORMAT),
					},
				],
				[
					{
						label: "Propriétés",
						onClick: () => openPage(PROJECT_PROPERTIES_PAGE_DATA),
					},
				],
			],
		}),
		[newGrafcet, openPage],
	);
}
