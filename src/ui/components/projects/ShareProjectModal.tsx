"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { useProjectStore } from "./ProjectContext";
import { useT } from "@/ui/i18n/useT";
import {
	Alert,
	Box,
	Button,
	Divider,
	IconButton,
	InputAdornment,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import CopyIcon from "@mui/icons-material/ContentCopy";
import RevokeIcon from "@mui/icons-material/LinkOff";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";

function buildShareUrl(token: string): string {
	if (typeof window === "undefined") return "";
	const url = new URL(window.location.href);
	url.searchParams.delete("projectId");
	url.searchParams.set("shareToken", token);
	return url.toString();
}

export default function ShareProjectModal() {
	const {
		shareModalVisible,
		setShareModalVisible,
		shareToken,
		sharingManager,
		isSharedProject,
	} = useProjectStore(
		useShallow((s) => ({
			shareModalVisible: s.ui.shareModalVisible,
			setShareModalVisible: s.setShareModalVisible,
			shareToken: s.shareToken,
			sharingManager: s.sharingManager,
			isSharedProject: s.isSharedProject,
		})),
	);

	const t = useT("projects.share");
	const [copied, setCopied] = useState(false);

	const shareUrl = shareToken ? buildShareUrl(shareToken) : "";

	const onCopy = useCallback(() => {
		if (!shareUrl) return;
		void navigator.clipboard.writeText(shareUrl).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [shareUrl]);

	const onRevoke = useCallback(() => {
		void sharingManager.unshareProject();
	}, [sharingManager]);

	const onClose = useCallback(() => {
		setShareModalVisible(false);
	}, [setShareModalVisible]);

	if (isSharedProject) return null;

	return (
		<CustomModal
			open={shareModalVisible}
			onClose={onClose}
			title={t("title")}
			width={520}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{shareToken ? (
					<>
						<Alert severity="success">
							{t("sharedAlert")}
						</Alert>

						<TextField
							label={t("linkLabel")}
							value={shareUrl}
							InputProps={{
								readOnly: true,
								endAdornment: (
									<InputAdornment position="end">
										<Tooltip title={t("copy")}>
											<IconButton
												onClick={onCopy}
												edge="end"
												aria-label={t("copyLinkAria")}
											>
												<CopyIcon />
											</IconButton>
										</Tooltip>
									</InputAdornment>
								),
							}}
							size="small"
						/>

						{copied && (
							<Typography variant="caption" color="success.main">
								{t("copied")}
							</Typography>
						)}

						<Divider />

						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<RevokeIcon fontSize="small" color="error" />
							<Typography variant="body2" color="text.secondary" flex={1}>
								{t("revokeHint")}
							</Typography>
							<Button
								variant="outlined"
								color="error"
								size="small"
								onClick={onRevoke}
							>
								{t("revoke")}
							</Button>
						</Box>
					</>
				) : (
					<Typography color="text.secondary">
						{t("noActiveLink")}
					</Typography>
				)}

				<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onClose}>
						{t("close")}
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
