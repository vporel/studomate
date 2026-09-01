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

export default function CloudConflictDialog() {
	const { visible, lifecycleManager } = useProjectStore(
		useShallow((s) => ({
			visible: s.ui.cloudConflictModalVisible,
			lifecycleManager: s.lifecycleManager,
		})),
	);

	if (!visible) return null;

	return (
		<Dialog open maxWidth="xs" fullWidth>
			<DialogTitle>Projet modifié ailleurs</DialogTitle>
			<DialogContent>
				<Typography variant="body2">
					Ce projet a été enregistré depuis un autre appareil après son
					ouverture ici. Enregistrer maintenant écraserait ces modifications.
				</Typography>
				<Typography variant="body2" mt={1}>
					Voulez-vous reprendre la version en ligne (vos modifications locales
					seront perdues) ou enregistrer votre travail sous un autre nom ?
				</Typography>
			</DialogContent>
			<DialogActions>
				<Button
					variant="outlined"
					onClick={() => void lifecycleManager.resolveCloudConflict("reload")}
				>
					Reprendre la version en ligne
				</Button>
				<Button
					variant="contained"
					onClick={() => void lifecycleManager.resolveCloudConflict("copy")}
				>
					Enregistrer sous...
				</Button>
			</DialogActions>
		</Dialog>
	);
}
