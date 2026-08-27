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
	const { draftConflictModal, resolveDraftConflict } = useProjectStore(
		useShallow((s) => ({
			draftConflictModal: s.ui.draftConflictModal,
			resolveDraftConflict: s.resolveDraftConflict,
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
					onClick={() => void resolveDraftConflict("real")}
				>
					Version enregistrée
				</Button>
				<Button
					variant="contained"
					onClick={() => void resolveDraftConflict("draft")}
				>
					Reprendre le brouillon
				</Button>
			</DialogActions>
		</Dialog>
	);
}
