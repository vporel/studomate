"use client";

import Page from "@/ui/components/pages/Page";
import { useProjectStore } from "@/ui/components/projects/ProjectContext";
import { HMI_SIMULATION_PAGE_ID } from "@/ui/stores/project/managers/hmi.manager";
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
const HmiSimulationPageView = () => {
	const project = useProjectStore((s) => s.project);
	const activeHmiPageId = useProjectStore((s) => s.hmiSimulationActivePageId);
	const hmiPage = activeHmiPageId
		? project?.getHmiPage(activeHmiPageId)
		: undefined;

	// Pas de page à afficher (onglet ouvert sans page HMI résolue) : un seul `Page` porte la
	// visibilité de l'onglet ici — `HmiPageView` en fournit déjà un (via `HmiPageContent`) dans
	// l'autre branche, les imbriquer tous les deux doublonnerait le contrôle de visibilité.
	if (!hmiPage) {
		return (
			<Page
				pageId={HMI_SIMULATION_PAGE_ID}
				sx={{ justifyContent: "center", alignItems: "center" }}
			>
				<Typography sx={{ color: "text.secondary" }}>
					Aucune page HMI à afficher.
				</Typography>
			</Page>
		);
	}

	return (
		<HmiPageView
			key={hmiPage.id}
			initialHmiPage={hmiPage}
			tabPageId={HMI_SIMULATION_PAGE_ID}
			isSimulation
		/>
	);
};

export default HmiSimulationPageView;
