"use client";

import { PROJECT_PROPERTIES_PAGE_DATA } from "@/components/pages/ProjectPropertiesPage";
import { useProjectStore } from "@/components/projects/ProjectContext";
import { platformShortcut } from "@/lib/platform";
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
						onClick: () => newGrafcet("Sans titre", { type: "A4", orientation: "portrait" }),
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
