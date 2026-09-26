"use client";

import { useProjectStore } from "./ProjectContext";
import { useShallow } from "zustand/shallow";
import { useT } from "@/ui/i18n/useT";
import ConflictDialog from "./ConflictDialog";

export default function DraftConflictDialog() {
	const { draftConflictModal, lifecycleManager } = useProjectStore(
		useShallow((s) => ({
			draftConflictModal: s.ui.draftConflictModal,
			lifecycleManager: s.lifecycleManager,
		})),
	);

	const t = useT("projects.draftConflict");

	if (!draftConflictModal.visible) return null;

	return (
		<ConflictDialog
			title={t("title")}
			paragraphs={[t("body1"), t("body2")]}
			actions={[
				{
					label: t("keepSaved"),
					variant: "outlined",
					onClick: () => void lifecycleManager.resolveDraftConflict("real"),
				},
				{
					label: t("keepDraft"),
					variant: "contained",
					onClick: () => void lifecycleManager.resolveDraftConflict("draft"),
				},
			]}
		/>
	);
}
