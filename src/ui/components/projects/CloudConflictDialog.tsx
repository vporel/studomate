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
					onClick={() => void lifecycleManager.resolveCloudConflict("reload")}
				>
					{t("reload")}
				</Button>
				<Button
					variant="contained"
					onClick={() => void lifecycleManager.resolveCloudConflict("copy")}
				>
					{t("saveAs")}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
