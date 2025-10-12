"use client";

import { usePagesContext } from "@/components/pages/context/PagesContext";
import { useProjectContext } from "@/components/projects/ProjectContext";
import { useMemo } from "react";

export default function useProjectMenu() {
	const { newGrafcet } = useProjectContext();
	const { openProjectPropertiesPage } = usePagesContext();

	return useMemo(
		() => ({
			id: "project",
			label: "Projet",
			items: [
				[
					{
						label: "Nouveau grafcet",
						shortcut: "Ctrl+G",
						onClick: () => newGrafcet("Sans titre", { type: "A4", orientation: "portrait" }),
					},
				],
				[
					{
						label: "Propriétés",
						onClick: () => openProjectPropertiesPage(),
					},
				],
			],
		}),
		[newGrafcet, openProjectPropertiesPage]
	);
}
