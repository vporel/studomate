"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { useProjectStore } from "./ProjectContext";
import { Box, Button, Typography } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";

export default function ShareRequiresCloudModal() {
	const { visible, setVisible, sharingManager } = useProjectStore(
		useShallow((s) => ({
			visible: s.ui.shareRequiresCloudModalVisible,
			setVisible: s.setShareRequiresCloudModalVisible,
			sharingManager: s.sharingManager,
		})),
	);

	const [submitting, setSubmitting] = useState(false);

	const onClose = useCallback(() => {
		if (submitting) return;
		setVisible(false);
	}, [submitting, setVisible]);

	const onConfirm = useCallback(async () => {
		setSubmitting(true);
		try {
			await sharingManager.moveToCloudAndShare();
		} finally {
			setSubmitting(false);
		}
	}, [sharingManager]);

	return (
		<CustomModal
			open={visible}
			onClose={onClose}
			title="Envoyer le projet dans le cloud"
			width={480}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Typography color="text.secondary">
					Ce projet est stocké localement sur cet appareil. Pour le partager, il
					doit d&apos;abord être envoyé dans le cloud. Il restera modifiable
					uniquement depuis votre compte.
				</Typography>

				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
					<Button onClick={onClose} disabled={submitting}>
						Annuler
					</Button>
					<Button
						variant="contained"
						startIcon={<CloudUploadIcon />}
						onClick={() => void onConfirm()}
						disabled={submitting}
					>
						Envoyer et partager
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
