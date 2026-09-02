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
import { enUS, fr } from "date-fns/locale";
import { useLocaleContext } from "@/ui/i18n/LocaleProvider";
import { useT } from "@/ui/i18n/useT";
import { useCallback, useEffect, useState } from "react";

type Props = {
	onOpen: (draftData: string) => void;
};

export default function DraftRecoveryDialog({ onOpen }: Props) {
	const t = useT("projects.draftRecovery");
	const tc = useT("projects.common");
	const { locale } = useLocaleContext();
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
				<DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
				<DialogContent>
					<Typography>
						{t("confirmDeleteAll")}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDeleteAll(false)}>{tc("cancel")}</Button>
					<Button color="error" variant="contained" onClick={handleDeleteAll}>
						{t("deleteAll")}
					</Button>
				</DialogActions>
			</Dialog>
		);
	}

	if (confirmDeleteId) {
		const draft = drafts.find((d) => d.projectId === confirmDeleteId);
		return (
			<Dialog open maxWidth="xs" fullWidth>
				<DialogTitle>{t("confirmDeleteTitle")}</DialogTitle>
				<DialogContent>
					<Typography>
						{t("confirmDeleteOne", { name: draft?.projectName ?? "" })}
					</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setConfirmDeleteId(null)}>{tc("cancel")}</Button>
					<Button
						color="error"
						variant="contained"
						onClick={() => handleDeleteOne(confirmDeleteId)}
					>
						{t("delete")}
					</Button>
				</DialogActions>
			</Dialog>
		);
	}

	return (
		<Dialog open maxWidth="sm" fullWidth>
			<DialogTitle>{t("title")}</DialogTitle>
			<DialogContent>
				<Typography variant="body2" color="text.secondary" mb={2}>
					{t("intro")}
				</Typography>
				<List disablePadding>
					{drafts.map((draft, i) => (
						<Box key={draft.projectId}>
							{i > 0 && <Divider />}
							<ListItem disablePadding sx={{ py: 1, gap: 1, flexWrap: "wrap" }}>
								<ListItemText
									primary={draft.projectName}
									secondary={t("savedAgo", { ago: formatDistanceToNow(draft.savedAt, { addSuffix: true, locale: locale === "en" ? enUS : fr }) })}
									sx={{ flex: 1, minWidth: 0 }}
								/>
								<Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
									<Button
										size="small"
										variant="contained"
										onClick={() => handleOpen(draft)}
									>
										{t("open")}
									</Button>
									<Button
										size="small"
										color="error"
										onClick={() => setConfirmDeleteId(draft.projectId)}
									>
										{t("discardOne")}
									</Button>
								</Box>
							</ListItem>
						</Box>
					))}
				</List>
			</DialogContent>
			<DialogActions sx={{ justifyContent: "space-between" }}>
				<Button color="error" onClick={() => setConfirmDeleteAll(true)}>
					{t("cancelAll")}
				</Button>
				<Button onClick={handlePass}>{t("pass")}</Button>
			</DialogActions>
		</Dialog>
	);
}
