"use client";

import { useProjectStore } from "./ProjectContext";
import { useShallow } from "zustand/shallow";
import { useT } from "@/ui/i18n/useT";
import ConflictDialog from "./ConflictDialog";

export default function CloudConflictDialog() {
	const { visible, lifecycleManager } = useProjectStore(
		useShallow((s) => ({
			visible: s.ui.cloudConflictModalVisible,
			lifecycleManager: s.lifecycleManager,
		})),
	);

	const t = useT("projects.cloudConflict");

	if (!visible) return null;

	return (
		<ConflictDialog
			title={t("title")}
			paragraphs={[t("body1"), t("body2")]}
			actions={[
				{
					label: t("reload"),
					variant: "outlined",
					onClick: () => void lifecycleManager.resolveCloudConflict("reload"),
				},
				{
					label: t("saveAs"),
					variant: "contained",
					onClick: () => void lifecycleManager.resolveCloudConflict("copy"),
				},
			]}
		/>
	);
}
