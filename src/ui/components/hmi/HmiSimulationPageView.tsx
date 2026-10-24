"use client";

import Page from "@/ui/components/pages/Page";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { HMI_SIMULATION_PAGE_ID } from "@/ui/stores/project/managers/hmi.manager";
import { useT } from "@/ui/i18n/useT";
import { Typography } from "@mui/material";
import HmiPageView from "./HmiPageView";

/**
 * Onglet "Simulation HMI" (voir `HmiManager.openHmiSimulationPageIfAny`) — un seul onglet
 * fixe dans lequel la page HMI affichée change (voir `hmiSimulationActivePageId`), au lieu de
 * naviguer entre onglets de conception : l'action "changer de page" (voir `executeHmiAction`)
 * reste ainsi interne à cette vue, sans perturber la barre d'onglets.
 *
 * `HmiPageView` remonté avec une nouvelle clé à chaque changement de page plutôt que de faire
 * évoluer une page HMI existante en place — un `HmiContextProvider` est lié à une seule page à sa
 * création. Effet de bord accepté : si la page affichée ici est aussi ouverte comme onglet de
 * conception, les deux stores partagent la même pile annuler/rétablir (voir
 * `HmiManager.getCommandsStack`, tenue par id de page) — sans risque pour les données, cette vue
 * n'émettant jamais de commande.
 */
const HmiSimulationPageView = ({
	tabPageId = HMI_SIMULATION_PAGE_ID,
	defaultHmiPageId = null,
	fitToContainer,
}: {
	/** Id de l'onglet à des fins de visibilité : l'onglet fixe de la simulation HMI par défaut. */
	tabPageId?: string;
	/** Page affichée tant qu'aucune navigation n'a désigné `hmiSimulationActivePageId`. */
	defaultHmiPageId?: string | null;
	fitToContainer?: boolean;
}) => {
	const t = useT("hmiEditor.simulationView");
	const project = useProjectStore((s) => s.project);
	const activeHmiPageId =
		useProjectStore((s) => s.hmiSimulationActivePageId) ?? defaultHmiPageId;
	const hmiPage = activeHmiPageId
		? project?.getHmiPage(activeHmiPageId)
		: undefined;

	// Pas de page à afficher (onglet ouvert sans page HMI résolue) : un seul `Page` porte la
	// visibilité de l'onglet ici — `HmiPageView` en fournit déjà un (via `HmiPageContent`) dans
	// l'autre branche, les imbriquer tous les deux doublonnerait le contrôle de visibilité.
	if (!hmiPage) {
		return (
			<Page
				pageId={tabPageId}
				sx={{ justifyContent: "center", alignItems: "center" }}
			>
				<Typography sx={{ color: "text.secondary" }}>{t("noPage")}</Typography>
			</Page>
		);
	}

	return (
		<HmiPageView
			key={hmiPage.id}
			initialHmiPage={hmiPage}
			tabPageId={tabPageId}
			isSimulation
			fitToContainer={fitToContainer}
		/>
	);
};

export default HmiSimulationPageView;
