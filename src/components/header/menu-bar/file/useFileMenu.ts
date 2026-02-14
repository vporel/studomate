"use client";

import { useProjectStore } from "@/components/projects/ProjectContext";
import { platformShortcut } from "@/lib/platform";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useFileMenu(): AppMenuType {
	const { setOpenModalVisible, newProject, closeProject, saveProject, activeScopeType } = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			newProject: state.newProject,
			closeProject: state.closeProject,
			saveProject: state.saveProject,
			activeScopeType: state.activeScopeType,
		})),
	);

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
						shortcut: platformShortcut("Ctrl+O", "Cmd+O"),
						onClick: () => setOpenModalVisible(true),
					},
				],
				[
					{
						label: "Enregistrer",
						shortcut: platformShortcut("Ctrl+S", "Cmd+S"),
						onClick: saveProject,
					},
				],
				[
					{
						label: "Exporter",
						shortcut: platformShortcut("Ctrl+E", "Cmd+E"),
						disabled: activeScopeType !== "grafcet",
					},
				],
				[
					{
						label: "Fermer le projet",
						shortcut: platformShortcut("Ctrl+F4", "Cmd+W"),
						onClick: closeProject,
					},
				],
			],
		}),
		[newProject, setOpenModalVisible, saveProject, closeProject],
	);
}
