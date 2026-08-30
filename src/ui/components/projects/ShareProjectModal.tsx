"use client";

import CustomModal from "@/ui/lib/mui/CustomModal";
import { useProjectStore } from "./ProjectContext";
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
			title="Partager le projet"
			width={520}
		>
			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{shareToken ? (
					<>
						<Alert severity="success">
							Le projet est partagé. Toute personne disposant du lien peut le
							consulter et le simuler.
						</Alert>

						<TextField
							label="Lien de partage"
							value={shareUrl}
							InputProps={{
								readOnly: true,
								endAdornment: (
									<InputAdornment position="end">
										<Tooltip title="Copier">
											<IconButton
												onClick={onCopy}
												edge="end"
												aria-label="Copier le lien"
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
								Lien copié dans le presse-papier.
							</Typography>
						)}

						<Divider />

						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<RevokeIcon fontSize="small" color="error" />
							<Typography variant="body2" color="text.secondary" flex={1}>
								Révoquer le lien rend le partage inaccessible immédiatement.
							</Typography>
							<Button
								variant="outlined"
								color="error"
								size="small"
								onClick={onRevoke}
							>
								Révoquer
							</Button>
						</Box>
					</>
				) : (
					<Typography color="text.secondary">
						Aucun lien de partage actif pour ce projet.
					</Typography>
				)}

				<Box sx={{ display: "flex", justifyContent: "flex-end" }}>
					<Button variant="contained" onClick={onClose}>
						Fermer
					</Button>
				</Box>
			</Box>
		</CustomModal>
	);
}
