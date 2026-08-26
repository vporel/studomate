"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { Box, Button, Typography } from "@mui/material";

/** Panel affiché dans le bloc "Propriétés" quand aucun widget n'est sélectionné — propriétés de
 * la page HMI elle-même plutôt que d'un widget. Lit `isMain` depuis le projet (pas depuis le store
 * de la page, voir `HmiManager.setMainHmiPage`) : une seule page principale à la fois dans tout le
 * projet, une mutation qu'un store borné à une seule page ne peut pas porter lui-même. */
const HmiPagePropertiesPanel = ({ hmiPageId }: { hmiPageId: string }) => {
	const hmiManager = useProjectStore((s) => s.hmiManager);
	const isMain = useProjectStore((s) => s.project?.getHmiPage(hmiPageId)?.isMain ?? false);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5 }}>
			<Typography sx={{ fontSize: "0.8rem", color: "#888" }}>
				Aucun widget sélectionné — propriétés de la page.
			</Typography>
			<Button
				size="small"
				variant="outlined"
				disabled={isMain}
				onClick={() => hmiManager.setMainHmiPage(hmiPageId)}
				sx={{ alignSelf: "flex-start" }}
			>
				Définir en page principale
			</Button>
		</Box>
	);
};

export default HmiPagePropertiesPanel;
