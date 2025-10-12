"use client";

import { useProjectContext } from "@/components/projects/ProjectContext";
import { useMemo } from "react";

export default function useFileMenu() {
	const { newProject, openProject, saveProject } = useProjectContext();

	return useMemo(
		() => ({
			id: "file",
			label: "Fichier",
			items: [
				[
					{
						label: "Nouveau projet",
						// The shortcut Ctrl+N is reserved by the browser to open a new window so we don't use it
						onClick: newProject,
					},
				],
				[
					{
						label: "Ouvrir projet",
						shortcut: "Ctrl+O",
						onClick: openProject,
					},
				],
				[
					{
						label: "Enregistrer",
						shortcut: "Ctrl+S",
						onClick: saveProject,
					},
				],
				[
					{
						label: "Exporter",
						shortcut: "Ctrl+E",
					},
				],
			],
		}),
		[newProject, openProject, saveProject]
	);
}
