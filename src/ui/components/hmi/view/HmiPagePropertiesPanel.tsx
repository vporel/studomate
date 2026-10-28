"use client";

import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { useT } from "@/ui/i18n/useT";
import { Box, Button, Typography } from "@mui/material";

/** Panel affiché dans le bloc "Propriétés" quand aucun widget n'est sélectionné — propriétés de
 * la page HMI elle-même plutôt que d'un widget. Lit le statut de page principale depuis le projet (pas depuis le store
 * de la page, voir `HmiManager.setMainHmiPage`) : une seule page principale à la fois dans tout le
 * projet, une mutation qu'un store borné à une seule page ne peut pas porter lui-même. */
const HmiPagePropertiesPanel = ({
	hmiPageId,
	readOnly = false,
}: {
	hmiPageId: string;
	readOnly?: boolean;
}) => {
	const t = useT("hmiEditor.panel");
	const hmiManager = useProjectStore((s) => s.hmiManager);
	const isMain = useProjectStore(
		(s) => s.project?.isMainHmiPage(hmiPageId) ?? false,
	);

	return (
		<Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, p: 1.5 }}>
			<Typography sx={{ fontSize: "0.8rem", color: "#888" }}>
				{t("noWidgetSelected")}
			</Typography>
			<Button
				size="small"
				variant="outlined"
				disabled={isMain || readOnly}
				onClick={() => hmiManager.setMainHmiPage(hmiPageId)}
				sx={{ alignSelf: "flex-start" }}
			>
				{t("setAsMainPage")}
			</Button>
		</Box>
	);
};

export default HmiPagePropertiesPanel;
