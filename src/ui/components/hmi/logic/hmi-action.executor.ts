import { HmiAction } from "@/schemas/hmi/hmi-widget.schema";
import HmiManager from "@/ui/stores/project/managers/hmi.manager";

/** Exécute une action déclenchée par un événement de widget (voir `HmiWidgetEvents`) — un seul
 * type d'action pour l'instant, `switch` prêt à en accueillir d'autres. */
export function executeHmiAction(
	action: HmiAction,
	hmiManager: HmiManager,
): void {
	switch (action.type) {
		case "navigate-to-page":
			// Navigation interne à l'onglet "Simulation HMI" (voir
			// `HmiManager.navigateHmiSimulation`), pas un changement d'onglet de conception.
			hmiManager.navigateHmiSimulation(action.targetHmiPageId);
			break;
	}
}
