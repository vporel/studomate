"use client";

import { useProjectStore } from "./ProjectContext";
import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Typography,
} from "@mui/material";
import { useShallow } from "zustand/shallow";
import { useT } from "@/ui/i18n/useT";

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
		<Dialog open maxWidth="xs" fullWidth>
			<DialogTitle>{t("title")}</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					{t("body1")}
				</Typography>
				<Typography variant="body2" mt={1}>
					{t("body2")}
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button
					variant="outlined"
					onClick={() => void lifecycleManager.resolveDraftConflict("real")}
				>
					{t("keepSaved")}
				</Button>
				<Button
					variant="contained"
					onClick={() => void lifecycleManager.resolveDraftConflict("draft")}
				>
					{t("keepDraft")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
