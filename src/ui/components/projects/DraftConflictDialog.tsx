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

export default function DraftConflictDialog() {
	const { draftConflictModal, lifecycleManager } = useProjectStore(
		useShallow((s) => ({
			draftConflictModal: s.ui.draftConflictModal,
			lifecycleManager: s.lifecycleManager,
		})),
	);

	if (!draftConflictModal.visible) return null;

	return (
		<Dialog open maxWidth="xs" fullWidth>
			<DialogTitle>Version non enregistrée trouvée</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					Ce projet a une version non enregistrée plus récente que la dernière
					sauvegarde.
				</Typography>
				<Typography variant="body2" mt={1}>
					Voulez-vous reprendre à partir du brouillon ou de la dernière version
					enregistrée ?
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button
					variant="outlined"
					onClick={() => void lifecycleManager.resolveDraftConflict("real")}
				>
					Version enregistrée
				</Button>
				<Button
					variant="contained"
					onClick={() => void lifecycleManager.resolveDraftConflict("draft")}
				>
					Reprendre le brouillon
				</Button>
			</DialogActions>
		</Dialog>
	);
}
