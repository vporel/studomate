"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { platformShortcut } from "@/ui/lib/platform";
import {
	Box,
	Divider,
	Table,
	TableBody,
	TableCell,
	TableRow,
	Typography,
} from "@mui/material";

type ShortcutGroup = {
	title: string;
	items: { label: string; shortcut: string }[];
};

const SHORTCUT_GROUPS: ShortcutGroup[] = [
	{
		title: "Fichier",
		items: [
			{
				label: "Ouvrir un projet",
				shortcut: platformShortcut("Ctrl+O", "Cmd+O"),
			},
			{ label: "Enregistrer", shortcut: platformShortcut("Ctrl+S", "Cmd+S") },
			{
				label: "Enregistrer sous",
				shortcut: platformShortcut("Ctrl+Maj+S", "Cmd+Maj+S"),
			},
			{ label: "Exporter", shortcut: platformShortcut("Ctrl+E", "Cmd+E") },
			{
				label: "Fermer le projet",
				shortcut: platformShortcut("Ctrl+F4", "Cmd+W"),
			},
		],
	},
	{
		title: "Projet",
		items: [
			{
				label: "Nouveau grafcet",
				shortcut: platformShortcut("Ctrl+G", "Cmd+G"),
			},
			{
				label: "Nouveau ladder",
				shortcut: platformShortcut("Ctrl+L", "Cmd+L"),
			},
		],
	},
	{
		title: "Édition",
		items: [
			{ label: "Annuler", shortcut: platformShortcut("Ctrl+Z", "Cmd+Z") },
			{ label: "Rétablir", shortcut: platformShortcut("Ctrl+Y", "Cmd+Y") },
			{
				label: "Tout sélectionner",
				shortcut: platformShortcut("Ctrl+A", "Cmd+A"),
			},
			{ label: "Copier", shortcut: platformShortcut("Ctrl+C", "Cmd+C") },
			{ label: "Couper", shortcut: platformShortcut("Ctrl+X", "Cmd+X") },
			{ label: "Coller", shortcut: platformShortcut("Ctrl+V", "Cmd+V") },
			{
				label: "Supprimer (sélection HMI)",
				shortcut: "Suppr / Retour arrière",
			},
		],
	},
];

type Props = {
	open: boolean;
	onClose: () => void;
};

export default function ShortcutsModal({ open, onClose }: Props) {
	return (
		<CustomModal
			open={open}
			onClose={onClose}
			title="Raccourcis clavier"
			width={480}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{SHORTCUT_GROUPS.map((group, i) => (
					<Box key={group.title}>
						{i > 0 && <Divider sx={{ mb: 2 }} />}
						<Typography
							variant="overline"
							color="text.secondary"
							fontWeight={600}
						>
							{group.title}
						</Typography>
						<Table size="small">
							<TableBody>
								{group.items.map((item) => (
									<TableRow
										key={item.label}
										sx={{ "&:last-child td": { border: 0 } }}
									>
										<TableCell sx={{ pl: 0, color: "text.primary" }}>
											{item.label}
										</TableCell>
										<TableCell align="right" sx={{ pr: 0 }}>
											<Box
												component="kbd"
												sx={{
													fontFamily: "monospace",
													fontSize: "0.8rem",
													background: (th) => th.palette.grey[100],
													border: (th) => `1px solid ${th.palette.grey[300]}`,
													borderRadius: 1,
													px: 1,
													py: 0.25,
													whiteSpace: "nowrap",
												}}
											>
												{item.shortcut}
											</Box>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</Box>
				))}
			</Box>
		</CustomModal>
	);
}
