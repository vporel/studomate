"use client";

import { useT } from "@/ui/i18n/useT";
import CloseIcon from "@mui/icons-material/Close";
import {
	Box,
	IconButton,
	Modal,
	Paper,
	Tooltip,
	Typography,
} from "@mui/material";
import { ReactNode } from "react";

type HmiFloatingPaneProps = {
	title: string;
	onClose: () => void;
	width: string;
	height?: string;
	maxHeight?: string;
	children: ReactNode;
};

/** Modale centrée avec en-tête (titre + bouton de fermeture) ; le contenu est libre. */
const HmiFloatingPane = ({
	title,
	onClose,
	width,
	height,
	maxHeight,
	children,
}: HmiFloatingPaneProps) => {
	const t = useT("hmiEditor.panel");

	return (
		<Modal open onClose={onClose}>
			<Paper
				sx={{
					position: "fixed",
					top: "50%",
					left: "50%",
					transform: "translate(-50%, -50%)",
					width,
					height,
					maxHeight,
					display: "flex",
					flexDirection: "column",
					outline: "none",
				}}
			>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						px: 2,
						py: 1,
						borderBottom: "1px solid #e0e0e0",
					}}
				>
					<Typography variant="h6">{title}</Typography>
					<Tooltip title={t("close")}>
						<IconButton size="small" onClick={onClose} aria-label={t("close")}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Tooltip>
				</Box>
				{children}
			</Paper>
		</Modal>
	);
};

export default HmiFloatingPane;
