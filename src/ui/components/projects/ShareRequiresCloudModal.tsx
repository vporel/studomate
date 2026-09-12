"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { useProjectStore } from "./ProjectContext";
import { useT } from "@/ui/i18n/useT";
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

	const t = useT("projects.shareRequiresCloud");
	const tc = useT("projects.common");
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
			title={t("title")}
			width={480}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				<Typography color="text.secondary">
					{t("body")}
				</Typography>

				<Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
					<Button onClick={onClose} disabled={submitting}>
						{tc("cancel")}
					</Button>
					<Button
						variant="contained"
						startIcon={<CloudUploadIcon />}
						onClick={() => void onConfirm()}
						disabled={submitting}
					>
						{t("confirm")}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
