"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { PREFERENCES_PAGE_DATA } from "@/ui/components/pages/PreferencesPage";
import { useT } from "@/ui/i18n/useT";
import { platformShortcut } from "@/ui/lib/platform";
import { ProjectMode } from "@/ui/stores/project/ProjectMode.enum";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
import { AppMenuType } from "../app-menu-bar";

export default function useFileMenu(): AppMenuType {
	const {
		setOpenModalVisible,
		setExportModalVisible,
		setSaveAsModalVisible,
		lifecycleManager,
		pagesManager,
	} = useProjectStore(
		useShallow((state) => ({
			setOpenModalVisible: state.setOpenModalVisible,
			setExportModalVisible: state.setExportModalVisible,
			setSaveAsModalVisible: state.setSaveAsModalVisible,
			lifecycleManager: state.lifecycleManager,
			pagesManager: state.pagesManager,
		})),
	);
	const designing = useProjectStore(
		(state) => state.mode === ProjectMode.DESIGN,
	);
	const t = useT("menu.file");

	return useMemo(
		() => ({
			id: "file",
			label: t("title"),
			items: [
				[
					{
						label: t("newProject"),
						// The shortcut Ctrl+N is reserved by the browser to open a new window so we don't use it
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							void lifecycleManager.newProject();
						},
					},
					{
						label: t("openProject"),
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
						label: t("save"),
						shortcut: platformShortcut("Ctrl+S", "Cmd+S"),
						onClick: () => {
							void lifecycleManager.saveProject();
						},
					},
					{
						label: t("saveAs"),
						shortcut: platformShortcut("Ctrl+Shift+S", "Cmd+Shift+S"),
						onClick: () => setSaveAsModalVisible(true),
					},
					{
						label: t("export"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							setExportModalVisible(true);
						},
					},
				],
				[
					{
						label: t("closeProject"),
						disabled: !designing,
						onClick: () => {
							if (!designing) return;
							void lifecycleManager.closeProject();
						},
					},
				],
				[
					{
						label: t("preferences"),
						onClick: () => pagesManager.openPage(PREFERENCES_PAGE_DATA),
					},
				],
			],
		}),
		[
			lifecycleManager,
			pagesManager,
			setOpenModalVisible,
			setExportModalVisible,
			setSaveAsModalVisible,
			designing,
			t,
		],
	);
}
