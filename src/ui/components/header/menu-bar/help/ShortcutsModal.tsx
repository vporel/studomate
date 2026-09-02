"use client";

import { useT } from "@/ui/i18n/useT";
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

type Props = {
	open: boolean;
	onClose: () => void;
};

export default function ShortcutsModal({ open, onClose }: Props) {
	const t = useT("shortcuts");

	const groups: ShortcutGroup[] = [
		{
			title: t("groups.file"),
			items: [
				{ label: t("openProject"), shortcut: platformShortcut("Ctrl+O", "Cmd+O") },
				{ label: t("save"), shortcut: platformShortcut("Ctrl+S", "Cmd+S") },
				{
					label: t("saveAs"),
					shortcut: platformShortcut("Ctrl+Maj+S", "Cmd+Maj+S"),
				},
			],
		},
		{
			title: t("groups.project"),
			items: [
				{ label: t("newGrafcet"), shortcut: platformShortcut("Ctrl+G", "Cmd+G") },
				{ label: t("newLadder"), shortcut: platformShortcut("Ctrl+L", "Cmd+L") },
			],
		},
		{
			title: t("groups.edit"),
			items: [
				{ label: t("undo"), shortcut: platformShortcut("Ctrl+Z", "Cmd+Z") },
				{ label: t("redo"), shortcut: platformShortcut("Ctrl+Y", "Cmd+Y") },
				{ label: t("selectAll"), shortcut: platformShortcut("Ctrl+A", "Cmd+A") },
				{ label: t("copy"), shortcut: platformShortcut("Ctrl+C", "Cmd+C") },
				{ label: t("cut"), shortcut: platformShortcut("Ctrl+X", "Cmd+X") },
				{ label: t("paste"), shortcut: platformShortcut("Ctrl+V", "Cmd+V") },
				{ label: t("deleteHmiSelection"), shortcut: t("deleteKey") },
			],
		},
	];

	return (
		<CustomModal
			open={open}
			onClose={onClose}
			title={t("title")}
			width={480}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{groups.map((group, i) => (
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
