"use client";

import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, IconButton, Typography } from "@mui/material";
import { ReactNode } from "react";

interface HmiCanvasSidebarSectionProps {
	title: string;
	children: ReactNode;
	/** Peut rétrécir sous sa hauteur naturelle pour que la colonne entière (voir `HmiCanvas`) ne
	 * dépasse jamais la hauteur du canvas — le contenu défile alors dans l'espace restant plutôt
	 * que de pousser les autres blocs hors champ. */
	fillRemainingSpace?: boolean;
	/** Repli contrôlé par le parent (voir `HmiCanvas`) : un seul bloc de la colonne déplié à la
	 * fois. */
	collapsed: boolean;
	onToggle: () => void;
}

/** Bloc repliable de la colonne latérale du canvas HMI (voir `HmiCanvas`) — un titre avec une
 * icône de repli à droite, et son contenu en dessous quand déplié. */
const HmiCanvasSidebarSection = ({ title, children, fillRemainingSpace, collapsed, onToggle }: HmiCanvasSidebarSectionProps) => {
	return (
		<Box
			sx={{
				display: "flex",
				flexDirection: "column",
				minHeight: 0,
				flex: fillRemainingSpace && !collapsed ? 1 : "0 0 auto",
				backgroundColor: "#fff",
				border: "1px solid #e0e0e0",
				borderRadius: 1,
			}}
		>
			<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1 }}>
				<Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
					{title}
				</Typography>
				<IconButton size="small" onClick={onToggle} aria-label={collapsed ? `Déplier ${title}` : `Replier ${title}`}>
					{collapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
				</IconButton>
			</Box>
			{!collapsed && <Box sx={{ minHeight: 0, overflow: "auto" }}>{children}</Box>}
		</Box>
	);
};

export default HmiCanvasSidebarSection;
