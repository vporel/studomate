"use client";

import {
	deleteAllDrafts,
	deleteDraft,
	Draft,
	getAllDrafts,
} from "@/persistence/draft.storage";
import {
	Box,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	Divider,
	List,
	ListItem,
	ListItemText,
	Typography,
} from "@mui/material";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useCallback, useEffect, useState } from "react";

type Props = {
	onOpen: (draftData: string) => void;
};

export default function DraftRecoveryDialog({ onOpen }: Props) {
	const [drafts, setDrafts] = useState<Draft[]>([]);
	const [open, setOpen] = useState(false);
	const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
	const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

	useEffect(() => {
		const found = getAllDrafts();
		if (found.length > 0) {
			setDrafts(found);
			setOpen(true);
		}
	}, []);

	const handleOpen = useCallback(
		(draft: Draft) => {
			setOpen(false);
			onOpen(draft.data);
		},
		[onOpen],
	);

	const handleDeleteOne = useCallback(
		(projectId: string) => {
			deleteDraft(projectId);
			const remaining = drafts.filter((d) => d.projectId !== projectId);
			setDrafts(remaining);
			setConfirmDeleteId(null);
			if (remaining.length === 0) setOpen(false);
		},
		[drafts],
	);

	const handleDeleteAll = useCallback(() => {
		deleteAllDrafts();
		setDrafts([]);
		setConfirmDeleteAll(false);
		setOpen(false);
	}, []);

	const handlePass = useCallback(() => {
		setOpen(false);
	}, []);

	if (!open) return null;

	if (confirmDeleteAll) {
		return (
			<Dialog open maxWidth="xs" fullWidth>
				<DialogTitle>Confirmer la suppression</DialogTitle>
				<DialogContent>
					<Typography>
						Supprimer tous les brouillons ? Cette action est irréversible.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDeleteAll(false)}>Annuler</Button>
					<Button color="error" variant="contained" onClick={handleDeleteAll}>
						Tout supprimer
					</Button>
				</DialogActions>
			</Dialog>
		);
	}

	if (confirmDeleteId) {
		const draft = drafts.find((d) => d.projectId === confirmDeleteId);
		return (
			<Dialog open maxWidth="xs" fullWidth>
				<DialogTitle>Confirmer la suppression</DialogTitle>
				<DialogContent>
					<Typography>
						Supprimer le brouillon de <strong>{draft?.projectName}</strong> ?
						Cette action est irréversible.
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDeleteId(null)}>Annuler</Button>
					<Button
						color="error"
						variant="contained"
						onClick={() => handleDeleteOne(confirmDeleteId)}
					>
						Supprimer
					</Button>
				</DialogActions>
			</Dialog>
		);
	}

	return (
		<Dialog open maxWidth="sm" fullWidth>
			<DialogTitle>Brouillons non enregistrés</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary" mb={2}>
					Des modifications non enregistrées ont été trouvées. Voulez-vous les
					récupérer ?
				</Typography>
				<List disablePadding>
					{drafts.map((draft, i) => (
						<Box key={draft.projectId}>
							{i > 0 && <Divider />}
							<ListItem disablePadding sx={{ py: 1, gap: 1, flexWrap: "wrap" }}>
								<ListItemText
									primary={draft.projectName}
									secondary={`Sauvegardé ${formatDistanceToNow(draft.savedAt, { addSuffix: true, locale: fr })}`}
									sx={{ flex: 1, minWidth: 0 }}
								/>
								<Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
									<Button
										size="small"
										variant="contained"
										onClick={() => handleOpen(draft)}
									>
										Ouvrir
									</Button>
									<Button
										size="small"
										color="error"
										onClick={() => setConfirmDeleteId(draft.projectId)}
									>
										Annuler
									</Button>
								</Box>
							</ListItem>
						</Box>
					))}
				</List>
			</DialogContent>
			<DialogActions sx={{ justifyContent: "space-between" }}>
				<Button color="error" onClick={() => setConfirmDeleteAll(true)}>
					Tout annuler
				</Button>
				<Button onClick={handlePass}>Passer</Button>
			</DialogActions>
		</Dialog>
	);
}
