"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { platformShortcut } from "@/ui/lib/platform";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useFileMenu(): AppMenuType {
	const {
		setOpenModalVisible,
		setExportModalVisible,
		setPdfExportModalVisible,
		setSaveAsModalVisible,
		newProject,
		closeProject,
		saveProject,
	} = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			setExportModalVisible: state.setExportModalVisible,
			setPdfExportModalVisible: state.setPdfExportModalVisible,
			setSaveAsModalVisible: state.setSaveAsModalVisible,
			newProject: state.newProject,
			closeProject: state.closeProject,
			saveProject: state.saveProject,
		})),
	);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
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
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							void newProject();
						},
					},
				],
				[
					{
						label: "Ouvrir projet",
						shortcut: platformShortcut("Ctrl+O", "Cmd+O"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							setOpenModalVisible(true);
						},
					},
				],
				[
					{
						label: "Enregistrer",
						shortcut: platformShortcut("Ctrl+S", "Cmd+S"),
						onClick: () => {
							void saveProject();
						},
					},
				],
				[
					{
						label: "Enregistrer sous",
						shortcut: platformShortcut("Ctrl+Shift+S", "Cmd+Shift+S"),
						onClick: () => setSaveAsModalVisible(true),
					},
				],
				[
					{
						label: "Exporter",
						shortcut: platformShortcut("Ctrl+E", "Cmd+E"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							setExportModalVisible(true);
						},
					},
				],
				[
					{
						label: "Exporter en PDF",
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							setPdfExportModalVisible(true);
						},
					},
				],
				[
					{
						label: "Fermer le projet",
						shortcut: platformShortcut("Ctrl+F4", "Cmd+W"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							void closeProject();
						},
					},
				],
			],
		}),
		[
			newProject,
			saveProject,
			closeProject,
			setOpenModalVisible,
			setExportModalVisible,
			setPdfExportModalVisible,
			setSaveAsModalVisible,
			designing,
		],
	);
}
